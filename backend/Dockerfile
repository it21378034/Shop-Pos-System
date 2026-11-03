# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/GroceryPro.Domain/GroceryPro.Domain.csproj", "src/GroceryPro.Domain/"]
COPY ["src/GroceryPro.Application/GroceryPro.Application.csproj", "src/GroceryPro.Application/"]
COPY ["src/GroceryPro.Infrastructure/GroceryPro.Infrastructure.csproj", "src/GroceryPro.Infrastructure/"]
COPY ["src/GroceryPro.API/GroceryPro.API.csproj", "src/GroceryPro.API/"]

RUN dotnet restore "src/GroceryPro.API/GroceryPro.API.csproj"

COPY . .
WORKDIR "/src/src/GroceryPro.API"
RUN dotnet build "GroceryPro.API.csproj" -c Release -o /app/build
RUN dotnet publish "GroceryPro.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "GroceryPro.API.dll"]
