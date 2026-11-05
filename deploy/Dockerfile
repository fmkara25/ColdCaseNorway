FROM node:22-bookworm-slim AS frontend
WORKDIR /source
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /source
COPY backend/ backend/
RUN dotnet restore backend/ColdCase.Api/ColdCase.Api.csproj
RUN dotnet publish backend/ColdCase.Api/ColdCase.Api.csproj -c Release --no-restore -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /app/publish .
COPY --from=frontend /source/dist ./wwwroot
ENV ASPNETCORE_HTTP_PORTS=8080 ColdCase__ServeFrontend=true
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "ColdCase.Api.dll"]
