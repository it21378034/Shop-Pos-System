using GroceryPro.Application.Interfaces;
using GroceryPro.Infrastructure.Data;
using GroceryPro.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace GroceryPro.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Database Connection string: LocalDB fallback or SQL Server / Azure SQL
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=(localdb)\\MSSQLLocalDB;Database=GroceryProDB;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

        services.AddDbContext<GroceryProDbContext>(options =>
            options.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.MigrationsAssembly(typeof(GroceryProDbContext).Assembly.FullName);
            }));

        // Application Services
        services.AddScoped<IBarcodeService, BarcodeService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IPosService, PosService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IPurchasingService, PurchasingService>();
        services.AddScoped<IReportingService, ReportingService>();

        // JWT Authentication
        var secret = configuration["Jwt:SecretKey"] ?? "GroceryPro_Super_Secret_Key_For_Jwt_Signing_Must_Be_Long_2026";
        var issuer = configuration["Jwt:Issuer"] ?? "GroceryPro";
        var audience = configuration["Jwt:Audience"] ?? "GroceryProClient";

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = System.TimeSpan.Zero
            };
        });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("SuperAdminOnly", policy => policy.RequireRole("SuperAdmin"));
            options.AddPolicy("AdminAccess", policy => policy.RequireRole("SuperAdmin", "Admin"));
            options.AddPolicy("ManagerAccess", policy => policy.RequireRole("SuperAdmin", "Admin", "Manager"));
            options.AddPolicy("CashierAccess", policy => policy.RequireRole("SuperAdmin", "Admin", "Manager", "Cashier"));
        });

        return services;
    }
}
