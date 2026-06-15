<?php

test('guest is redirected to login', function () {
    $response = $this->get('/');

    $response->assertStatus(302);
});
