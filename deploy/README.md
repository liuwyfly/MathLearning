# AuthServTs Docker Swarm 部署指南

## 架构概览

```
                    [Internet]
                        |
                   [Traefik]
                 (端口 80/443)
                        |
            +-----------+-----------+
            |                       |
        [app 副本 1]           [app 副本 2]
        (Fastify)              (Fastify)
            |                       |
            +-----------+-----------+
                        |
                   [MySQL / RDS]
```

- **编排引擎**：Docker Swarm Mode（3 台服务器全部作为 Manager 节点，高可用）
- **入口网关**：Traefik（自动服务发现、负载均衡、HTTPS 可选）
- **应用**：AuthServTs（Fastify + TypeScript）
- **数据库**：阿里云 RDS MySQL（`rm-f8z432717qy6hg59r.mysql.rds.aliyuncs.com`），不再在 Swarm 内运行 MySQL 容器。

---

## 1. 服务器准备

假设你有 3 台云服务器（Ubuntu 22.04 LTS 示例），IP 分别为：

- `node-1`：192.168.1.11
- `node-2`：192.168.1.12
- `node-3`：192.168.1.13

### 1.1 每台服务器安装 Docker

```bash
# 安装 Docker（Ubuntu 示例）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录使权限生效
```

### 1.2 组建 Swarm 集群

在 **node-1** 上执行：

```bash
docker swarm init --advertise-addr 192.168.1.11
```

执行后会输出一条 `docker swarm join --token ...` 命令，在 **node-2** 和 **node-3** 上执行该命令加入集群。

验证集群状态：

```bash
docker node ls
```

---

## 2. 创建 Docker Secrets

生产环境使用 Docker Secrets 注入敏感信息，避免将密码明文写入 compose 文件或环境变量。

在 **任意 Manager 节点**（如 node-1）上执行：

```bash
# JWT 签名密钥（请替换为高强度随机字符串）
echo -n 'your-very-strong-jwt-secret-min-32-chars' | docker secret create jwt_secret -

# MySQL 密码（连接阿里云 RDS 所用）
echo -n 'your_mysql_password' | docker secret create mysql_password -

# 注册验证码
echo -n 'your_secret_register_code' | docker secret create register_validation_code -
```

> 注意：Secret 创建后不可修改，只能删除重建。更新 Secret 需要重新部署服务。

---

## 3. 构建并推送镜像

### 3.1 本地构建（适合快速测试）

如果你直接在每台服务器上源码构建：

```bash
docker build -t authserv:latest .
```

### 3.2 推送到镜像仓库（推荐）

2-3 台机器建议统一从镜像仓库拉取，避免版本不一致。

```bash
# 以阿里云 ACR 为例
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com
docker build -t registry.cn-hangzhou.aliyuncs.com/your_namespace/authserv:latest .
docker push registry.cn-hangzhou.aliyuncs.com/your_namespace/authserv:latest
```

推送后，修改 `docker-compose.yml` 中 `app` 服务的 `image` 字段：

```yaml
  app:
    image: registry.cn-hangzhou.aliyuncs.com/your_namespace/authserv:latest
    # build: ...  # 删除或注释掉 build 部分
```

---

## 4. 部署 Stack

将代码仓库克隆到 **任意 Manager 节点**，进入项目根目录，执行：

```bash
docker stack deploy -c docker-compose.yml authserv
```

等待服务启动：

```bash
docker service ls
watch -n 1 docker service ls
```

看到 `authserv_app` 的 `REPLICAS` 变为 `2/2` 即表示部署成功。

### 4.1 验证服务

访问任意节点的 IP：

```bash
curl http://192.168.1.11/ping
# 预期输出: {"pong":true}
```

由于 Traefik 使用 `mode: host` 发布端口，只要请求到达任意一台节点，都会被 Traefik 接收并负载均衡到后端 app 容器。

---

## 5. 数据库配置

### 方案 A：使用托管 MySQL（推荐）

如果你使用阿里云 RDS、AWS RDS、腾讯云数据库等：

1. `docker-compose.yml` 中已将 `MYSQL_HOST` 配置为阿里云 RDS 地址：

```yaml
environment:
  - MYSQL_HOST=rm-f8z432717qy6hg59r.mysql.rds.aliyuncs.com
```

2. 确保 Swarm 节点与 RDS 在同一 VPC / 安全组，并开放 3306 端口（建议仅对 Swarm 节点安全组开放，不要暴露到公网）。

3. 在 RDS 中提前创建数据库和用户：

```sql
CREATE DATABASE Lagrange CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'stallion'@'%' IDENTIFIED BY 'your_mysql_password';
GRANT ALL PRIVILEGES ON Lagrange.* TO 'stallion'@'%';
FLUSH PRIVILEGES;
```

4. 部署 Stack：

```bash
docker stack deploy -c docker-compose.yml authserv
```

---

## 6. 日常运维

### 查看日志

```bash
# 查看所有 app 副本的日志
docker service logs -f authserv_app

# 查看特定容器日志
docker ps | grep authserv_app
docker logs -f <container_id>
```

### 扩容

```bash
# 将 app 扩容到 3 个副本
docker service scale authserv_app=3
```

### 滚动更新

更新代码后重新构建镜像并推送到仓库，然后在 Manager 节点执行：

```bash
docker service update --image registry.cn-hangzhou.aliyuncs.com/your_namespace/authserv:latest authserv_app
```

### 回滚

```bash
docker service update --rollback authserv_app
```

### 停止整个 Stack

```bash
docker stack rm authserv
```

---

## 7. 启用 HTTPS（可选）

如果你已有域名解析到 3 台服务器的公网 IP（建议使用负载均衡或 DNS 轮询），可以启用 Traefik 的 HTTPS：

1. 编辑 `docker-compose.yml` 中 `traefik` 服务的 `command` 和 `ports`，取消注释 HTTPS 相关行。
2. 将 `traefik.http.routers.authserv.entrypoints=web` 改为 `websecure`。
3. 添加证书解析器标签：

```yaml
- "traefik.http.routers.authserv.tls.certresolver=letsencrypt"
```

重新部署即可自动申请 Let's Encrypt 证书。

---

## 8. 安全建议

| 建议 | 说明 |
|------|------|
| 使用托管数据库 | 避免在 Swarm 中管理有状态数据，减少数据丢失风险。 |
| 使用 Docker Secrets | 不将密码写入文件或环境变量。 |
| 限制端口暴露 | 仅暴露 80/443 到公网，MySQL 3306 不应暴露到公网。 |
| 配置防火墙 | 使用云厂商安全组，仅开放 22、80、443。 |
| 定期备份 | 在阿里云 RDS 中配置自动备份策略（建议每天）。 |
