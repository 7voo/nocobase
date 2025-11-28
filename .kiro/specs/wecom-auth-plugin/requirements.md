# 需求文档

## 简介

本插件为 NocoBase 提供企业微信认证功能，支持两种登录方式：
1. **PC 扫码登录**：用户在电脑浏览器上通过企业微信移动应用扫描二维码登录
2. **企业微信内一键登录**：用户在企业微信内打开应用，点击按钮直接登录（OAuth2.0）

这是一个 MVP 版本，专注于核心的认证流程。

## 术语表

- **System**: 指 NocoBase 企业微信认证插件
- **User**: 使用 NocoBase 系统的最终用户
- **Administrator**: NocoBase 系统管理员
- **WeCom**: 企业微信（WeCom/WeChat Work）
- **WeCom API**: 企业微信提供的 OAuth 2.0 认证接口
- **Authenticator**: NocoBase 中的认证器配置实例
- **QR Code**: 二维码，用于企业微信扫码登录
- **OAuth Flow**: OAuth 2.0 授权流程
- **Access Token**: 企业微信 API 访问令牌
- **User Binding**: 用户账号与企业微信身份的关联关系

## 需求

### 需求 1：管理员配置认证器

**用户故事：** 作为系统管理员，我想要配置企业微信认证器，以便用户可以使用企业微信扫码登录系统。

#### 验收标准

1. WHEN 管理员访问认证设置页面 THEN THE System SHALL 显示创建新认证器的选项
2. WHEN 管理员选择企业微信认证类型 THEN THE System SHALL 显示配置表单，包含企业 ID、应用 ID、应用密钥和回调地址字段
3. WHEN 管理员提交有效的配置信息 THEN THE System SHALL 保存认证器配置并生成回调 URL
4. WHEN 管理员启用认证器 THEN THE System SHALL 在登录页面显示企业微信登录选项
5. WHEN 管理员禁用认证器 THEN THE System SHALL 在登录页面隐藏企业微信登录选项

### 需求 2：用户扫码登录

**用户故事：** 作为用户，我想要通过企业微信扫码登录，以便快速安全地访问系统。

#### 验收标准

1. WHEN 用户访问登录页面且企业微信认证器已启用 THEN THE System SHALL 显示企业微信登录按钮
2. WHEN 用户点击企业微信登录按钮 THEN THE System SHALL 显示企业微信二维码
3. WHEN 用户使用企业微信扫描二维码并确认 THEN THE System SHALL 获取授权码并完成 OAuth 流程
4. WHEN OAuth 流程成功完成 THEN THE System SHALL 从企业微信 API 获取用户信息
5. WHEN 用户信息获取成功 THEN THE System SHALL 验证用户身份并创建登录会话

### 需求 3：自动用户注册

**用户故事：** 作为首次使用企业微信登录的用户，我希望系统自动为我创建账号，以便无需手动注册即可使用系统。

#### 验收标准

1. WHEN 用户首次通过企业微信登录且自动注册已启用 THEN THE System SHALL 使用企业微信用户信息创建新用户账号
2. WHEN 创建新用户账号 THEN THE System SHALL 使用企业微信用户 ID 作为唯一标识符
3. WHEN 创建新用户账号 THEN THE System SHALL 从企业微信获取并保存用户昵称
4. WHEN 创建新用户账号且配置了默认角色 THEN THE System SHALL 为新用户分配默认角色
5. WHEN 用户账号创建成功 THEN THE System SHALL 自动登录该用户

### 需求 4：OAuth 安全流程

**用户故事：** 作为系统架构师，我希望 OAuth 流程符合安全标准，以便保护用户数据和防止攻击。

#### 验收标准

1. WHEN 系统生成 OAuth 授权请求 THEN THE System SHALL 包含随机生成的 state 参数用于 CSRF 防护
2. WHEN 系统接收 OAuth 回调 THEN THE System SHALL 验证 state 参数与原始请求匹配
3. WHEN state 参数验证失败 THEN THE System SHALL 拒绝请求并返回错误信息
4. WHEN 系统获取企业微信 access token THEN THE System SHALL 使用 HTTPS 协议进行通信
5. WHEN 系统存储敏感信息 THEN THE System SHALL 加密存储应用密钥等敏感配置

### 需求 5：错误处理

**用户故事：** 作为用户，当登录过程出现错误时，我希望看到清晰的错误提示，以便了解问题并采取相应措施。

#### 验收标准

1. WHEN 企业微信 API 返回错误 THEN THE System SHALL 记录错误日志并向用户显示友好的错误消息
2. WHEN 授权码缺失或无效 THEN THE System SHALL 返回错误信息并提示用户重试
3. WHEN 网络请求失败 THEN THE System SHALL 自动重试最多 3 次
4. WHEN 用户信息获取失败 THEN THE System SHALL 中止登录流程并显示错误消息
5. WHEN 自动注册被禁用且用户不存在 THEN THE System SHALL 返回错误信息提示用户联系管理员

### 需求 6：企业微信 API 集成

**用户故事：** 作为开发者，我需要正确集成企业微信 API，以便实现可靠的认证功能。

#### 验收标准

1. WHEN 系统需要调用企业微信 API THEN THE System SHALL 首先获取有效的 access token
2. WHEN access token 过期 THEN THE System SHALL 自动刷新 token 并重试请求
3. WHEN 系统获取用户信息 THEN THE System SHALL 调用企业微信用户信息接口并解析响应
4. WHEN 企业微信 API 返回成功响应 THEN THE System SHALL 验证响应格式并提取必要字段
5. WHEN 企业微信 API 调用失败 THEN THE System SHALL 记录详细错误信息用于调试

### 需求 7：插件生命周期管理

**用户故事：** 作为系统管理员，我希望插件能够正确安装、启用、禁用和卸载，以便灵活管理系统功能。

#### 验收标准

1. WHEN 插件首次安装 THEN THE System SHALL 注册企业微信认证类型到认证系统
2. WHEN 插件启用 THEN THE System SHALL 加载客户端和服务端组件
3. WHEN 插件禁用 THEN THE System SHALL 停止提供企业微信登录功能但保留配置数据
4. WHEN 插件卸载 THEN THE System SHALL 清理注册的认证类型
5. WHEN 插件更新 THEN THE System SHALL 保持现有配置和用户绑定数据不变

### 需求 8：企业微信内 OAuth2.0 登录

**用户故事：** 作为在企业微信内使用应用的用户，我希望能够点击按钮直接登录，而不需要扫描二维码，以便更便捷地访问系统。

#### 验收标准

1. WHEN 用户在企业微信客户端内访问登录页面 THEN THE System SHALL 检测企业微信环境并显示一键登录按钮
2. WHEN 用户点击一键登录按钮 THEN THE System SHALL 构造 OAuth2.0 授权链接并重定向到企业微信授权页面
3. WHEN 用户在企业微信内确认授权 THEN THE System SHALL 接收授权码并完成 OAuth 流程
4. WHEN OAuth 流程完成 THEN THE System SHALL 获取用户信息并创建登录会话
5. WHEN 用户在非企业微信环境访问 THEN THE System SHALL 显示二维码扫码登录选项

### 需求 9：登录方式自动检测

**用户故事：** 作为用户，我希望系统能够自动识别我的访问环境，并提供最合适的登录方式，以便获得最佳的用户体验。

#### 验收标准

1. WHEN 系统加载登录页面 THEN THE System SHALL 检测用户代理字符串判断是否在企业微信环境
2. WHEN 检测到企业微信环境 THEN THE System SHALL 优先显示一键登录按钮
3. WHEN 检测到非企业微信环境 THEN THE System SHALL 显示二维码扫码登录
4. WHEN 用户在企业微信内点击一键登录 THEN THE System SHALL 使用 OAuth2.0 授权流程
5. WHEN 用户在 PC 浏览器点击登录 THEN THE System SHALL 显示二维码供扫描
