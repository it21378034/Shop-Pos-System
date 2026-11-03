using GroceryPro.Domain.Entities;
using GroceryPro.Domain.Enums;
using GroceryPro.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GroceryPro.API.Controllers;

[Authorize]
[Route("api/v1/[controller]")]
public class CategoriesController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public CategoriesController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.Categories
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.NameEn)
            .ToListAsync();
        return Ok(categories);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] Category category)
    {
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Category input)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        category.NameEn = input.NameEn;
        category.NameSi = input.NameSi;
        category.Code = input.Code;
        category.Description = input.Description;
        await _context.SaveChangesAsync();
        return Ok(category);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();
        category.IsDeleted = true;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[Authorize]
[Route("api/v1/[controller]")]
public class UnitsController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public UnitsController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var units = await _context.Units
            .OrderBy(u => u.Code)
            .ToListAsync();
        return Ok(units);
    }
}

[Authorize]
[Route("api/v1/[controller]")]
public class SuppliersController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public SuppliersController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await _context.Suppliers
            .Where(s => !s.IsDeleted)
            .OrderBy(s => s.CompanyName)
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] Supplier supplier)
    {
        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return Ok(supplier);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "SuperAdmin,Admin,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Supplier input)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null) return NotFound();

        supplier.CompanyName = input.CompanyName;
        supplier.ContactPerson = input.ContactPerson;
        supplier.Phone = input.Phone;
        supplier.Email = input.Email;
        supplier.Address = input.Address;
        supplier.TaxRegistrationNumber = input.TaxRegistrationNumber;
        await _context.SaveChangesAsync();
        return Ok(supplier);
    }
}

[Authorize]
[Route("api/v1/[controller]")]
public class CustomersController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public CustomersController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search)
    {
        var query = _context.Customers.Where(c => !c.IsDeleted);
        if (!string.IsNullOrWhiteSpace(search))
        {
            string s = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(s) || (c.PhoneNumber != null && c.PhoneNumber.Contains(s)));
        }
        var list = await query.OrderBy(c => c.Name).Take(50).ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Customer customer)
    {
        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();
        return Ok(customer);
    }
}

[Authorize]
[Route("api/v1/[controller]")]
public class ExpensesController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public ExpensesController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var locationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        var list = await _context.Expenses
            .Where(e => e.LocationId == locationId)
            .OrderByDescending(e => e.ExpenseDateUtc)
            .Take(100)
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Expense expense)
    {
        expense.LocationId = CurrentLocationId != Guid.Empty
            ? CurrentLocationId
            : (await _context.Locations.FirstOrDefaultAsync(l => l.IsMain))?.Id ?? Guid.Empty;

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();
        return Ok(expense);
    }
}

[Authorize]
[Route("api/v1/[controller]")]
public class SettingsController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public SettingsController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _context.ShopSettings.ToListAsync();
        return Ok(settings);
    }

    [HttpPut]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, string> settings)
    {
        foreach (var (key, value) in settings)
        {
            var item = await _context.ShopSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (item != null)
            {
                item.Value = value;
            }
            else
            {
                _context.ShopSettings.Add(new ShopSetting { Key = key, Value = value });
            }
        }
        await _context.SaveChangesAsync();
        return Ok(new { message = "Settings updated successfully" });
    }
}

[Authorize(Roles = "SuperAdmin,Admin")]
[Route("api/v1/[controller]")]
public class UsersController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public UsersController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _context.Users
            .Include(u => u.DefaultLocation)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.FullName,
                u.PhoneNumber,
                u.IsActive,
                LocationName = u.DefaultLocation != null ? u.DefaultLocation.NameEn : "All Locations",
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _context.AuditLogs.OrderByDescending(a => a.CreatedAtUtc);
        int total = await query.CountAsync();
        var logs = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, logs });
    }
}

[Authorize]
[Route("api/v1/[controller]")]
public class LocationsController : BaseApiController
{
    private readonly GroceryProDbContext _context;

    public LocationsController(GroceryProDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var locations = await _context.Locations.Where(l => l.IsActive).ToListAsync();
        return Ok(locations);
    }
}
