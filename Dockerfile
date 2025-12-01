# From: https://pnpm.io/docker#example-2-build-multiple-docker-images-in-a-monorepo

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build
RUN pnpm deploy --filter=@cloudydaiyz/furu-api-app --prod /prod/api
RUN pnpm deploy --filter=@cloudydaiyz/furu-controller-app --prod /prod/controller
RUN pnpm deploy --filter=@cloudydaiyz/furu-web-app --prod /prod/web

FROM base AS api
COPY --from=build /prod/api /prod/api
WORKDIR /prod/api
EXPOSE 8000
CMD [ "pnpm", "start" ]

FROM base AS controller
COPY --from=build /prod/controller /prod/controller
WORKDIR /prod/controller
EXPOSE 8001
CMD [ "pnpm", "start" ]