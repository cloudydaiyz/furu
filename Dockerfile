# TODO: FIX

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build:local
RUN pnpm deploy --filter="@cloudydaiyz/furu-web-app" --prod /prod/web
RUN pnpm deploy --filter="@cloudydaiyz/furu-api-app" --prod /prod/api
RUN pnpm deploy --filter="@cloudydaiyz/furu-display-app" --prod /prod/display

FROM base AS web
COPY --from=build /prod/web /prod/web
WORKDIR /prod/web
EXPOSE 3000
CMD [ "pnpm", "start" ]

FROM base AS api
COPY --from=build /prod/api /prod/api
WORKDIR /prod/api
EXPOSE 4000
CMD [ "pnpm", "start" ]

FROM base AS display
COPY --from=build /prod/display /prod/display
WORKDIR /prod/display
EXPOSE 9091
CMD [ "pnpm", "start" ]