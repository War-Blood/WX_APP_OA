# frpc 运行镜像：直接打包内网主机上已有的 0.71.0 二进制
# 构建前：cp /usr/local/bin/frpc ./frp/frpc
FROM alpine:3.20
COPY frpc /usr/local/bin/frpc
ENTRYPOINT ["/usr/local/bin/frpc", "-c", "/etc/frpc/frpc-oa.toml"]
