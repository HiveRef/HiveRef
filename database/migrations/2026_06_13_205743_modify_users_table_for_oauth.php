<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
            $table->string('github_id')->nullable()->unique()->after('id');
            $table->text('github_token')->nullable()->after('password');
            $table->string('username')->nullable()->unique()->after('id');
            $table->string('avatar')->nullable()->after('username');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
            $table->string('password')->nullable(false)->change();
            $table->dropColumn(['github_id', 'github_token', 'username', 'avatar']);
        });
    }
};
