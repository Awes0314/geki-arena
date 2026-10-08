# Security Rules

## Secrets
- API Key
- credentials
- environment variables

## Authentication
- ユーザー認証は安全な方法で行うこと。
- パスワードはハッシュ化して保存すること。

## Authorization
- ユーザーの権限は最小限に設定すること。
- 権限の変更は適切にログを残すこと。

## Input Validation
- 入力データは適切に検証すること。
- SQLインジェクションやXSSなどの攻撃を防ぐための対策を行うこと。

## Database Security
- データベースへのアクセスは最小限に制限すること。
- 機密情報は暗号化して保存すること。

## Logging
- ログには機密情報を含めないこと。
- 重要な操作は適切にログを残すこと。

## Personal Information
- 個人情報は適切に保護すること。

## Prohibited Practices
- ハードコーディングされた秘密情報の使用
- 弱いパスワードの使用
- 権限の過剰付与
- 未検証の外部入力の使用
- 暗号化されていない通信の使用
- 不適切なエラーハンドリングの使用