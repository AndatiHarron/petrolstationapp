<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * The roles and permissions the application cannot run without.
 *
 * Written to be safe to run again. It used to use Role::create, which threw a
 * unique constraint violation on a second run — so it could only ever run once,
 * against an empty database, and could not be part of a deployment that boots
 * more than once.
 */
class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view_dashboard',
            'manage_stations',
            'manage_products',
            'manage_users',
            'view_reports',
            'lock_shifts',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $managerRole = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $superAdminRole = Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

        // sync rather than give, so a permission removed from the list above is
        // also removed from the role on the next run.
        $superAdminRole->syncPermissions(Permission::all());
        $adminRole->syncPermissions(Permission::all());
        $managerRole->syncPermissions([
            'view_dashboard',
            'lock_shifts',
        ]);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}
