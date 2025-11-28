开始开发
最后更新：2024/07/22
企业微信提供了OAuth的授权登录方式，可以让从企业微信终端打开的网页获取成员的身份信息，从而免去登录的环节。
企业应用中的URL链接（包括自定义菜单或者消息中的链接），均可通过OAuth2.0验证接口来获取成员的UserId身份信息。

OAuth2简介
OAuth2的设计背景，在于允许用户在不告知第三方自己的账号密码情况下，通过授权方式，让第三方服务可以获取自己的资源信息。
详细的协议介绍，开发者可以参考RFC 6749。

下面简单说明OAuth2中最经典的Authorization Code模式，流程如下：

流程图中，包含四个角色。

ResourceOwner为资源所有者，即为用户
User-Agent为浏览器
AuthorizationServer为认证服务器，可以理解为用户资源托管方，比如企业微信服务端
Client为第三方服务
调用流程为：
A) 用户访问第三方服务，第三方服务通过构造OAuth2链接（参数包括当前第三方服务的身份ID，以及重定向URI），将用户引导到认证服务器的授权页
B) 用户选择是否同意授权
C) 若用户同意授权，则认证服务器将用户重定向到第一步指定的重定向URI，同时附上一个授权码。
D) 第三方服务收到授权码，带上授权码来源的重定向URI，向认证服务器申请凭证。
E) 认证服务器检查授权码和重定向URI的有效性，通过后颁发AccessToken（调用凭证）

D)与E)的调用为后台调用，不通过浏览器进行
企业微信OAuth2接入流程
图1 企业微信OAuth2流程图
使用OAuth2前须知
关于网页授权的可信域名
REDIRECT_URL中的域名，需要先配置至应用的“可信域名”，否则跳转时会提示“redirect_uri参数错误”。
要求配置的可信域名，必须与访问链接的域名完全一致；若访问链接URL带了端口号，端口号也需要登记到可信域名中。举个例子：

假定重定向访问的链接是：https://mail.qq.com:8080/cgi-bin/helloworld：
配置域名	是否正确	原因
mail.qq.com:8080	correct	配置域名与访问域名完全一致
email.qq.com	error	配置域名必须与访问域名完全一致
support.mail.qq.com	error	配置域名必须与访问域名完全一致
*.qq.com	error	不支持泛域名设置
mail.qq.com	error	配置域名必须与访问域名完全一致，包括端口号
假定配置的可信域名是 mail.qq.com：
访问链接	是否正确	原因
https://mail.qq.com/cgi-bin/helloworld	correct	配置域名与访问域名完全一致
https://mail.qq.com/cgi-bin/redirect	correct	配置域名与访问域名完全一致，与协议头/链接路径无关
https://exmail.qq.com/cgi-bin/helloworld	error	配置域名必须与访问域名完全一致
关于UserID机制
UserId用于在一个企业内唯一标识一个用户，通过网页授权接口可以获取到当前用户的UserId信息，如果需要获取用户的更多信息可以调用 通讯录管理 - 成员接口 来获取。

静默授权与手动授权
静默授权：用户点击链接后，页面直接302跳转至 redirect_uri?code=CODE&state=STATE
手动授权：用户点击链接后，会弹出一个中间页，让用户选择是否授权，用户确认授权后再302跳转至 redirect_uri?code=CODE&state=STATE


个人敏感信息授权管理
用户首次进入oauth2页面进行手动授权后，30天内再次进入应用页面不会再弹出授权页，默认授权用户当前授权的敏感信息。若30天内用户需要修改个人敏感信息授权，可进入应用详情页的“个人敏感信息授权管理”页面，重新更改个人敏感信息授权。

目前仅2022.6.20 20:00后新创建的的自建应用以及代开发应用或者所有的第三方应用，且用户曾经通过进入oauth2页面进行手动授权过才会出现该入口。

缓存方案建议
通过OAuth2.0验证接口获取成员身份会有一定的时间开销。对于频繁获取成员身份的场景，建议采用如下方案：
1、企业应用中的URL链接直接填写企业自己的页面地址
2、成员操作跳转到步骤1的企业页面时，企业后台校验是否有标识成员身份的cookie信息，此cookie由企业生成
3、如果没有匹配的cookie，则重定向到OAuth验证链接，获取成员的身份信息后，由企业后台植入标识成员身份的cookie信息
4、根据cookie获取成员身份后，再进入相应的页面


————————————————

构造网页授权链接
最后更新：2024/07/30
如果企业需要在打开的网页里面携带用户的身份信息，第一步需要构造如下的链接来获取code参数：

https://open.weixin.qq.com/connect/oauth2/authorize?appid=CORPID&redirect_uri=REDIRECT_URI&response_type=code&scope=snsapi_base&state=STATE&agentid=AGENTID#wechat_redirect
参数说明：

参数	必须	说明
appid	是	企业的CorpID
redirect_uri	是	授权后重定向的回调链接地址，请使用urlencode对链接进行处理
response_type	是	返回类型，此时固定为：code
scope	是	应用授权作用域。
snsapi_base：静默授权，可获取成员的基础信息（UserId）；
snsapi_privateinfo：手动授权，可获取成员的详细信息，包含头像、二维码等敏感信息（此时要求成员必须在应用可见范围内）。
state	否	重定向后会带上state参数，企业可以填写a-zA-Z0-9的参数值，长度不可超过128个字节
agentid	是	应用agentid，建议填上该参数（对于第三方应用和代开发自建应用，在填写该参数的情况下或者在工作台、聊天工具栏、应用会话内发起oauth2请求的场景中，会触发接口许可的自动激活）。snsapi_privateinfo时必填否则报错；
#wechat_redirect	是	终端使用此参数判断是否需要带上身份信息
员工点击后，页面将跳转至 redirect_uri?code=CODE&state=STATE，企业可根据code参数获得员工的userid。code长度最大为512字节。

示例：

 

假定当前企业CorpID：wxCorpId
访问链接：http://api.3dept.com/cgi-bin/query?action=get

根据URL规范，将上述参数分别进行UrlEncode，得到拼接的OAuth2链接为：

https://open.weixin.qq.com/connect/oauth2/authorize?appid=wxCorpId&redirect_uri=http%3a%2f%2fapi.3dept.com%2fcgi-bin%2fquery%3faction%3dget&response_type=code&scope=snsapi_base&state=#wechat_redirect
 

注意，构造OAuth2链接中参数的redirect_uri是经过UrlEncode的
员工点击后，页面将跳转至

http://api.3dept.com/cgi-bin/query?action=get&code=AAAAAAgG333qs9EdaPbCAP1VaOrjuNkiAZHTWgaWsZQ&state=
企业可根据code参数调用获取员工的信息

scope的特殊情况
当oauth2中appid=corpid时，scope为snsapi_privateinfo时，必须填agentid参数，否则系统会视为snsapi_base，不会返回敏感信息。同时，要求成员必须在应用可见范围内，否则页面会报错提示成员不在可见范围内。

——————————————————

获取访问用户身份
最后更新：2022/09/23
该接口用于根据code获取成员信息，适用于自建应用与代开发应用

请求方式：GET（HTTPS）
请求地址：https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=ACCESS_TOKEN&code=CODE
参数说明：

参数	必须	说明
access_token	是	调用接口凭证
code	是	通过成员授权获取到的code，最大为512字节。每次成员授权带上的code将不一样，code只能使用一次，5分钟未被使用自动过期。
权限说明：
跳转的域名须完全匹配access_token对应应用的可信域名，否则会返回50001错误。
返回结果：
a) 当用户为企业成员时（无论是否在应用可见范围之内）返回示例如下：

{
   "errcode": 0,
   "errmsg": "ok",
   "userid":"USERID",
   "user_ticket": "USER_TICKET"
}
参数	说明
errcode	返回码
errmsg	对返回码的文本描述内容
userid	成员UserID。若需要获得用户详情信息，可调用通讯录接口：读取成员。如果是互联企业/企业互联/上下游，则返回的UserId格式如：CorpId/userid
user_ticket	成员票据，最大为512字节，有效期为1800s。
scope为snsapi_privateinfo，且用户在应用可见范围之内时返回此参数。
后续利用该参数可以获取用户信息或敏感信息，参见"获取访问用户敏感信息"。暂时不支持上下游或/企业互联场景
b) 非企业成员时，返回示例如下：

{
   "errcode": 0,
   "errmsg": "ok",
   "openid":"OPENID",
   "external_userid":"EXTERNAL_USERID"
}
参数	说明
errcode	返回码
errmsg	对返回码的文本描述内容
openid	非企业成员的标识，对当前企业唯一。不超过64字节
external_userid	外部联系人id，当且仅当用户是企业的客户，且跟进人在应用的可见范围内时返回。如果是第三方应用调用，针对同一个客户，同一个服务商不同应用获取到的id相同
出错返回示例：

{
   "errcode": 40029,
   "errmsg": "invalid code"
}


————————————

获取访问用户敏感信息
最后更新：2023/03/14
自建应用与代开发应用可通过该接口获取成员授权的敏感字段

请求方式：POST（HTTPS）
请求地址：https://qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail?access_token=ACCESS_TOKEN

请求包体：

{
   "user_ticket": "USER_TICKET"
}
参数说明：

参数	必须	说明
access_token	是	调用接口凭证
user_ticket	是	成员票据
 

权限说明：
成员必须在应用的可见范围内。

返回结果：

{
   "errcode": 0,
   "errmsg": "ok",
   "userid":"lisi",
   "gender":"1",
   "avatar":"http://shp.qpic.cn/bizmp/xxxxxxxxxxx/0",
   "qr_code":"https://open.work.weixin.qq.com/wwopen/userQRCode?vcode=vcfc13b01dfs78e981c",
   "mobile": "13800000000",
   "email": "zhangsan@gzdev.com",
   "biz_mail":"zhangsan@qyycs2.wecom.work",
   "address": "广州市海珠区新港中路"
}
参数说明：

参数	说明
errcode	返回码
errmsg	对返回码的文本描述内容
userid	成员UserID
gender	性别。0表示未定义，1表示男性，2表示女性。仅在用户同意snsapi_privateinfo授权时返回真实值，否则返回0.
avatar	头像url。仅在用户同意snsapi_privateinfo授权时返回真实头像，否则返回默认头像
qr_code	员工个人二维码（扫描可添加为外部联系人），仅在用户同意snsapi_privateinfo授权时返回
mobile	手机，仅在用户同意snsapi_privateinfo授权时返回，第三方应用不可获取
email	邮箱，仅在用户同意snsapi_privateinfo授权时返回，第三方应用不可获取
biz_mail	企业邮箱，仅在用户同意snsapi_privateinfo授权时返回，第三方应用不可获取
address	仅在用户同意snsapi_privateinfo授权时返回，第三方应用不可获取
注：对于自建应用与代开发应用，敏感字段需要管理员在应用详情里选择，且成员oauth2授权时确认后才返回。敏感字段包括：性别、头像、员工个人二维码、手机、邮箱、企业邮箱、地址。


