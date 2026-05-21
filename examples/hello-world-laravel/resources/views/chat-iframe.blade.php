<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chat Widget</title>

    @fonts

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/chat-iframe.jsx'])

    <style>
        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
        }

        #app {
            height: 100%;
        }
    </style>
</head>

<body>
    <div id="app"></div>
</body>

</html>
