Resource Uploader
===============================

一站式前端资源上传工具

## 使用

用法:

```
res-up 文件 [选项]
```

选项:

| 选项            | 描述                                                           | 类型                   |
|-----------------|----------------------------------------------------------------|------------------------|
| -h, --help      | 显示帮助信息                                                   | [布尔]                 |
| --compress, -c  | 是否压缩文件                                                   | [布尔] [默认值: true]  |
| --prefix, -p    | 自定义 URL 前缀                                                | [字符串]               |
| --refresh, -r   | 刷新 CDN 资源                                                  | [字符串]               |
| --name          | 自定义 URL 文件名                                              | [字符串]               |
| --base64        | 是否处理成 base64 内容，而不上传 CDN                           | [布尔] [默认值: false] |
| --dest          | 本机文件系统路径，使用此参数将保存文件到指定路径，而不上传 CDN | [字符串]               |
| --output-simple | 是否简化控制台输出                                             | [布尔] [默认值: false] |
| --version, -v   | 显示版本信息                                                   | [布尔]                 |

示例：

```
res-up filename.png
res-up "/Users/xxx/Desktop/**/*.png"
res-up "/Users/xxx/Desktop/**/*.png" --output-simple
res-up --prefix folder1/folder2 filename.png
res-up --prefix folder1/folder2 --name new.png filename.png
res-up --base64 filename.png
res-up --base64 --dest /Users/xxx/Desktop filename.png
res-up --dest /Users/xxx/Desktop filename.png
res-up --no-compress filename.png
res-up --refresh "https://domain.com/-/xxx/filename.png"
```