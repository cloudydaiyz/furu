FROM node:18-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY app.tgz .
RUN tar -xzf app.tgz -C . --strip-components=1
# RUN pnpm install --force
EXPOSE 3000

CMD ["pnpm", "start"]
