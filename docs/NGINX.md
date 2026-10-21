# Nginx — control-autoelevadores.sica

Bloque `server {}` para el Nginx de SicaLab (§4.1 del estándar). Va en el Nginx que ya está
en la red `sicalab_default`, junto a los demás `.sica`.

```nginx
server {
    listen 80;
    server_name control-autoelevadores.sica;

    # DNS interno de Docker: resuelve el contenedor en cada request
    # (Nginx arranca aunque la app todavía no esté levantada).
    resolver 127.0.0.11 valid=30s ipv6=off;
    set $upstream sicalab-control-autoelevadores-1:3000;

    # Un control puede traer hasta 21 fotos comprimidas (base64) en el JSON.
    client_max_body_size 30m;

    # SSE del tablero de Mantenimiento: sin buffer y con conexión larga.
    location /api/stream {
        proxy_pass http://$upstream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
    }

    location / {
        proxy_pass http://$upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Notas:

- **Nunca `localhost`** como upstream: dentro del contenedor de Nginx, `localhost` es el propio Nginx.
- `X-Real-IP` / `X-Forwarded-For` los usa la app para el rate limit (login y endpoints públicos)
  y para la auditoría.
- El heartbeat de la app es cada 25 s, así que el SSE no se corta por inactividad aunque el
  `proxy_read_timeout` fuera menor. Igual se deja en 24 h como pide el estándar.
- Verificación: `nginx -t && nginx -s reload`, luego `curl -I http://control-autoelevadores.sica/login`
  debe responder `200`.
