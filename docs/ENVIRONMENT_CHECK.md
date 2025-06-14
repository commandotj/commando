# 自动化依赖环境检测

为确保 commando-react 项目依赖环境一致，建议所有开发者在本地执行如下自动化检测脚本：

```sh
# 检查依赖管理工具
if [ -f yarn.lock ] || [ -f pnpm-lock.yaml ]; then
  echo "请删除 yarn.lock 和 pnpm-lock.yaml，仅保留 package-lock.json，统一使用 npm 管理依赖。"
  exit 1
fi

# 检查 Tailwind 版本
npx tailwindcss --version | grep '^3\.' || {
  echo "请安装 Tailwind CSS v3.x，避免使用 v4 及以上版本。"
  exit 1
}

echo "依赖环境检测通过：npm + Tailwind v3"
```

> 建议将上述脚本集成到 CI/CD 或 pre-commit 钩子，确保团队协作环境一致。 