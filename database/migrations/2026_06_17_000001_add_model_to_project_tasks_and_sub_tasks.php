<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->string('model')->nullable()->default('github/deepseek-v4')->after('prompt');
            $table->boolean('has_custom_api_key')->nullable()->default(false)->after('model');
        });

        Schema::table('project_sub_tasks', function (Blueprint $table) {
            $table->string('model')->nullable()->after('description');
            $table->boolean('has_custom_api_key')->nullable()->default(false)->after('model');
        });
    }

    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropColumn(['model', 'has_custom_api_key']);
        });

        Schema::table('project_sub_tasks', function (Blueprint $table) {
            $table->dropColumn(['model', 'has_custom_api_key']);
        });
    }
};
