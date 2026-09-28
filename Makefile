# VERSION 也可以取最新 tag , VERSION = $(shell git describe --tags --always)

IMAGE = ht-repo-registry.cn-heyuan.cr.aliyuncs.com/ht-elite/math-learning
VERSION = 1.1.13

build:
	docker build -t $(IMAGE):$(VERSION) .

push: build
	docker push $(IMAGE):$(VERSION)