<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @inertiaHead
        @viteReactRefresh
        @vite('resources/js/app.tsx')
    </head>
    <body class="bg-[#121214] text-white antialiased">
        @inertia
    </body>
</html>
