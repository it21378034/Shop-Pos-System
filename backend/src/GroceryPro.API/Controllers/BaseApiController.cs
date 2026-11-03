using Microsoft.AspNetCore.Mvc;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace GroceryPro.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected Guid CurrentUserId
    {
        get
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

            return Guid.TryParse(idClaim, out var id) ? id : Guid.Empty;
        }
    }

    protected Guid CurrentLocationId
    {
        get
        {
            var locClaim = User.FindFirst("LocationId")?.Value
                        ?? Request.Headers["X-Location-Id"].ToString();

            return Guid.TryParse(locClaim, out var id) ? id : Guid.Empty;
        }
    }
}
