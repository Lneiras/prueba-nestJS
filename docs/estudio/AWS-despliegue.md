# Despliegue en AWS – FleetCore API (documento de estudio)

Este documento explica **qué se hizo en AWS**, **por qué** se hizo así y **cómo se verifica**.
Está pensado para estudiarlo antes de la sustentación.

> Seguridad: este documento NO contiene contraseñas, claves ni valores reales del `.env`.
> Donde aparece un dato sensible se usa un marcador como `<IP_EC2>` o `<ENDPOINT_RDS>`.

---

## 1. Arquitectura en una imagen

```
                      Internet
                         │
          ┌──────────────┼──────────────────────────┐
          │              │                          │
   puerto 3000 (API)  puerto 8080 (Jenkins)   puerto 22 (SSH)
          │              │                          │
┌─────────▼──────────────▼──────────────────────────▼──────────┐
│  EC2  "prueba-nestJS"  (t4g.small, Linux ARM64)             │
│  IP elástica: <IP_EC2>                                       │
│                                                              │
│   ┌───────────────────────┐     ┌──────────────────────┐    │
│   │ contenedor "jenkins"  │────►│ contenedor           │    │
│   │ (Jenkins + cliente    │     │ "proyecto-app"       │    │
│   │  Docker)              │     │ (API NestJS, :3000)  │    │
│   └───────────────────────┘     └──────────┬───────────┘    │
│        usa /var/run/docker.sock            │                 │
└────────────────────────────────────────────┼─────────────────┘
                                             │ puerto 5432
                                             │ (solo desde el
                                             │  grupo de seguridad
                                             │  de la EC2)
                                  ┌──────────▼───────────┐
                                  │ RDS "proyecto-db"    │
                                  │ PostgreSQL           │
                                  │ base: proyecto       │
                                  │ (sin acceso público) │
                                  └──────────────────────┘
```

**Idea clave:** la API corre en un contenedor Docker dentro de una máquina virtual (EC2),
pero la base de datos NO está en esa máquina: está en un servicio administrado de AWS (RDS).

---

## 2. Conceptos de AWS que hay que dominar (para explicarlos)

| Concepto | Qué es | Para qué lo usamos aquí |
| -------- | ------ | ----------------------- |
| **EC2** | Servidor virtual en la nube (una "computadora" que alquilas). | Corre Docker, la API y Jenkins. |
| **Tipo de instancia** | Combinación de CPU y memoria. `t4g.small` = 2 vCPU ARM, 2 GiB RAM. | Es un tipo pequeño y económico, con arquitectura **ARM64**. |
| **Par de claves (key pair)** | Archivo `.pem` con el que entras por SSH. | Acceso a la EC2. **Nunca** se sube al repositorio (está en `.gitignore`). |
| **Grupo de seguridad (Security Group)** | Firewall virtual: qué puertos y desde qué origen se puede entrar. | Restringe qué puertos están abiertos en la EC2 y en RDS. |
| **IP elástica (Elastic IP)** | IP pública fija que no cambia al reiniciar la EC2. | La API y Jenkins quedan siempre en la misma dirección. |
| **RDS** | Base de datos relacional administrada (AWS se encarga de parches, respaldos y reinicios). | PostgreSQL para FleetCore. |
| **Endpoint de RDS** | Nombre de host de la base, por ejemplo `proyecto-db.xxxx.us-east-1.rds.amazonaws.com`. | Va en la variable `DB_HOST` de la API. |
| **Región** | Zona geográfica del centro de datos. | La región del proyecto es **us-east-1** (se ve en el endpoint de RDS). |
| **Acceso público de RDS** | Si está en "Sí", la base tiene IP pública. | Está en **"No"**: la base solo se alcanza desde la EC2. |

---

## 3. Recursos creados

| Recurso | Nombre | Configuración principal | Estado |
| ------- | ------ | ----------------------- | ------ |
| Instancia EC2 | `prueba-nestJS` | `t4g.small` (ARM64), AMI Ubuntu Server 24.04 LTS (arm64), disco de 15 GiB | Creada (apagada actualmente) |
| IP elástica | (nombre por confirmar) | `54.197.156.6` asociada a la EC2 | Asociada |
| Par de claves | `key-prueba` | Asignado en el lanzamiento; SSH con usuario `ubuntu` | Creado |
| Grupo de seguridad de la EC2 | `prueba-nestJS` (`sg-06f3d13c69f124503`) | Entrada: 22, 8080 y 3000 | Configurado |
| Grupos de seguridad adicionales | `ec2-rds-2` (`sg-035848fe3478185ba`), `ec2-rds-3` (`sg-0463c6009401d5f06`) | Relacionados con la conexión EC2 ↔ RDS (función exacta por confirmar) | Creados |
| Instancia RDS | `proyecto-db` | PostgreSQL **16.15**, capa gratuita, acceso público **No** | Creada (apagada actualmente) |
| Base de datos | `proyecto` | Creada manualmente con `psql` (ver 4.6b) | Creada |
| Usuario de la base | `postgres` (usuario maestro) | Contraseña guardada solo en Jenkins y en el `.env` de producción | Creado |
| Región | `us-east-1` | Región de la EC2 y de RDS (según el endpoint) | — |

> Nota: el grupo de seguridad de RDS debe ser el que permite 5432 solo desde el grupo de la EC2.
> Confirmar cuál de los grupos (`ec2-rds-2` o `ec2-rds-3`) es el de RDS y cuál el de la EC2 si hay dudas.

---

## 4. Paso a paso de lo que se hizo

> Nota: los pasos siguen la configuración documentada en el proyecto. Lo que aparece marcado como
> **(confirmar)** es una suposición o un detalle de la consola que aún no está verificado. Antes de
> sustentar, revisa esos puntos contra lo que realmente quedó configurado en AWS.

### 4.1 Crear la EC2
1. En la consola de EC2: **Launch instance**.
2. Tipo de instancia `t4g.small` (arquitectura ARM64). El motivo más probable es el costo (confirmar). Como la máquina es ARM, `bcrypt` debe tener binario para ARM (ver sección 8).
3. Imagen (AMI): `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-20261017` (Ubuntu 24.04 LTS, arm64). Por eso el usuario SSH es `ubuntu`.
4. Par de claves para entrar por SSH: `key-prueba`.
5. Grupo de seguridad (ver 4.3).
6. Disco de 15 GiB.

### 4.2 Asignar una IP elástica
1. **Elastic IPs → Allocate → Associate** a la instancia `prueba-nestJS`.
2. Resultado: una IP pública fija (`<IP_EC2>`). Sin esto, la IP cambiaría cada vez que se reinicia la EC2 y la API dejaría de responder en la dirección documentada.

### 4.3 Grupo de seguridad de la EC2 (firewall)
Solo se abren los puertos que la aplicación necesita. Los orígenes de la tabla son la configuración recomendada; confirmar lo que quedó configurado:

| Puerto | Protocolo | Origen | Para qué |
| ------ | --------- | ------ | -------- |
| 22 | SSH | **Mi IP** (no todo internet) | Entrar a la máquina para administrarla. |
| 8080 | TCP | **Mi IP** | Interfaz web de Jenkins. |
| 3000 | TCP | Abierto (0.0.0.0/0) | La API, para que la evalúen y se pueda probar. |

> Buena práctica: SSH y Jenkins deben abrirse solo a tu IP. El puerto 3000 se abre a todos porque la API es pública.
> Por eso el puerto 8080 de Jenkins debe restringirse: quien controla Jenkins controla el socket de Docker (y con él, la máquina).

### 4.4 Crear la base de datos RDS
1. **RDS → Create database → PostgreSQL 16.15**.
2. Plantilla de **capa gratuita** (usada: sí) para no generar costos.
3. Identificador de instancia: `proyecto-db`. Usuario maestro: `postgres`. La contraseña se guarda en un lugar seguro (no en el repositorio).
4. Nombre de la base inicial: no se creó desde RDS; la base `proyecto` se creó después con `psql` (ver 4.6b).
5. **Acceso público: No** (confirmado). La base nunca debe ser accesible desde internet.
6. Grupo de seguridad de RDS: `rds-sg` (ver 4.5).
7. Cifrado de conexión: PostgreSQL 15+ exige SSL. Por eso la API usa `DB_SSL=true`.

### 4.5 Grupo de seguridad de RDS (`rds-sg`)
- Entrada: **PostgreSQL, puerto 5432, origen = el grupo de seguridad de la EC2** (no una IP).
- Ventaja: si la EC2 cambia de IP, la regla sigue funcionando, porque la regla apunta al grupo y no a una dirección.
- Ningún otro origen puede conectarse a la base.

### 4.6 Instalar Docker en la EC2
Por SSH a la máquina (con el par de claves `key-prueba`):
```bash
ssh -i key-prueba.pem ubuntu@54.197.156.6
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git postgresql-client
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu     # permite usar docker sin sudo
exit                               # hay que salir y entrar de nuevo para que aplique el grupo
```
Qué instala cada paquete:
- `docker.io`: el motor de Docker.
- `docker-compose-v2`: el plugin `docker compose`.
- `git`: para clonar el repositorio en la EC2.
- `postgresql-client`: incluye `psql`, para conectarse a RDS y crear la base.

Verificación (resultado obtenido):
```
docker --version          → Docker version 29.1.3
docker compose version    → Docker Compose version 2.40.3
```

### 4.6b Conectar la EC2 a RDS y crear la base `proyecto`
Se hizo desde la terminal de la EC2 por SSH:
```bash
# a) Descargar el certificado oficial de AWS para conexiones SSL a RDS
curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# b) Conectarse a RDS con verificación completa del certificado (verify-full)
export RDSHOST="<ENDPOINT_RDS>"   # endpoint de proyecto-db (ver consola de RDS)
psql "host=$RDSHOST port=5432 dbname=postgres user=postgres sslmode=verify-full sslrootcert=./global-bundle.pem"
# (dentro de psql) → CREATE DATABASE proyecto;
```
Puntos para explicar:
- Esta conexión usa `sslmode=verify-full`: valida el certificado de RDS con el `global-bundle.pem` de AWS.
- La API, en cambio, usa `ssl: { rejectUnauthorized: false }` (cifra sin validar el certificado). Es más simple, pero **menos seguro**: una mejora posible es cargar el mismo `global-bundle.pem` en TypeORM.
- El `global-bundle.pem` es un certificado público de AWS; no es una llave privada, pero no se sube al repositorio.

### 4.6c Primer despliegue manual
Desde la carpeta del proyecto clonado en la EC2. El `.env` de producción debe estar presente en esa carpeta antes de ejecutar (confirmar cómo se colocó en esta primera vez):
```bash
docker compose -f docker-compose.prod.yml up -d --build --wait
```
- Construye la imagen y levanta el contenedor `proyecto-app`.
- `--wait` espera a que `/health` responda. Como `/health` consulta la base, este paso también confirma que la conexión a RDS funciona.
- Después se cargó el seeder con `docker exec proyecto-app npm run seed:prod` (ver 4.14).

### 4.7 Preparar el archivo `.env` de producción
La API lee sus variables del `.env`. En AWS ese archivo **no está en el repositorio**: vive en Jenkins como credencial.
Variables que debe tener (solo los nombres; los valores reales viven en Jenkins):

| Variable | Valor en AWS | Explicación |
| -------- | ------------ | ----------- |
| `PORT` | `3000` | Puerto de la API. |
| `DB_HOST` | `<ENDPOINT_RDS>` | Endpoint de RDS, **no** `localhost`. |
| `DB_PORT` | `5432` | Puerto de PostgreSQL. |
| `DB_USER` | `postgres` | Usuario de la base. |
| `DB_PASSWORD` | (solo en Jenkins) | Contraseña de RDS. |
| `DB_NAME` | `proyecto` | Nombre de la base. |
| `DB_SSL` | `true` | RDS exige conexión cifrada. |
| `JWT_SECRET` | (solo en Jenkins) | Clave para firmar tokens. Debe ser larga y aleatoria. |
| `JWT_EXPIRES_IN` | `1h` | Duración del token. |
| `API_KEYS` | (solo en Jenkins) | Claves para el endpoint externo, separadas por coma. |

### 4.8 Instalar Jenkins en la EC2
Jenkins corre en un contenedor, en la misma EC2 (archivos `jenkins/Dockerfile` y `jenkins/docker-compose.yml`).
```bash
git clone <URL_del_repositorio>
cd prueba-nestJS
docker compose -f jenkins/docker-compose.yml up -d --build
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword   # clave inicial de Jenkins
```
Puntos importantes que explicar:
- **`jenkins/Dockerfile`** parte de la imagen oficial de Jenkins y le instala solo el **cliente** de Docker y el plugin de compose. El servidor de Docker es el de la EC2.
- **`/var/run/docker.sock`** se monta dentro del contenedor: así, Jenkins usa el Docker de la EC2 para construir y levantar la API.
- **`user: root`** en el compose: permite usar el socket sin configurar grupos. Es una concesión de seguridad aceptada para la prueba, por eso el puerto 8080 se restringe a tu IP.
- **`jenkins_home`** es un volumen: la configuración, los plugins y las credenciales sobreviven a reinicios.

### 4.9 Guardar el `.env` de producción como credencial en Jenkins
1. Jenkins → **Manage Jenkins → Credentials → (global) → Add Credentials**.
2. Tipo: **Secret file**. ID: **`env-prod`**. Archivo: el `.env` de producción (4.7).
3. El `Jenkinsfile` busca exactamente ese ID (`credentialsId: 'env-prod'`).
4. Resultado: las contraseñas nunca aparecen en el código ni en el historial de Git.

### 4.10 Crear el job (pipeline) en Jenkins
1. **New Item → Pipeline** (nombre `prueba-nestJS`).
2. **Pipeline script from SCM** → Git → URL del repositorio → rama (`main`) → ruta del Jenkinsfile: `Jenkinsfile`.
3. Guardar. Para ejecutarlo: **Build Now**.
4. Hoy **no hay disparador automático**: el job solo corre con *Build Now*. (Mejora posible: *Poll SCM* o webhook de GitHub.)

### 4.11 Qué hace el pipeline (`Jenkinsfile`)
| Etapa | Qué hace | Por qué |
| ----- | -------- | ------- |
| **Descargar código** | `checkout scm`: trae el código del repositorio. | Siempre construir con el código del repositorio. |
| **Construir y desplegar** | Copia el secreto `env-prod` a `.env` y ejecuta `docker compose -f docker-compose.prod.yml up -d --build --wait`. | Construye la imagen nueva y levanta el contenedor. `--wait` espera a que `/health` responda; si no, el paso falla. |
| **Verificar** | `docker compose ... ps`. | Confirmar que el contenedor está `healthy`. |
| **post: failure** | Muestra las últimas 50 líneas de log de la API. | Para entender por qué falló sin entrar a la máquina. |
| **post: cleanup** | `rm -f .env`. | Borrar las contraseñas del disco al terminar, pase lo que pase. |

> `npm ci` y `npm run build` no aparecen como etapas separadas porque ocurren **dentro del Dockerfile**
> (etapa `build`). Así la imagen siempre se construye de forma reproducible.

### 4.12 Cómo se construye la imagen (`Dockerfile`)
- Etapa 1 (`build`): instala todas las dependencias (`npm ci`) y compila TypeScript (`npm run build`).
- Etapa 2 (final): instala solo dependencias de producción (`npm ci --omit=dev`), copia `dist/` y ejecuta `node dist/main` con el usuario `node` (sin privilegios de root).
- Resultado: imagen más liviana y más segura.

### 4.13 Compose de producción (`docker-compose.prod.yml`)
- Solo levanta **la API** (la base es RDS, fuera de Docker).
- `container_name: proyecto-app`: nombre fijo para poder ejecutar comandos dentro (por ejemplo el seeder).
- `ports: '3000:3000'`: publica la API en la EC2.
- `healthcheck`: consulta `GET /health`. Ese endpoint responde OK solo si la API puede hablar con RDS.

### 4.14 Cargar los datos iniciales (seeder) en RDS
Una sola vez, por SSH en la EC2:
```bash
docker exec proyecto-app npm run seed:prod
```
- Crea usuarios, mecánicos, talleres, vehículos y mantenimientos de prueba.
- Es idempotente: si se ejecuta otra vez, no duplica datos.

---

## 5. Cómo verificar que todo funciona

Reemplaza `<IP_EC2>` por la IP elástica.

```bash
# 1. ¿La API responde y la base está conectada? (debe devolver status ok y database up)
curl -s http://<IP_EC2>:3000/health

# 2. ¿La documentación Swagger carga? (en el navegador)
#    http://<IP_EC2>:3000/docs

# 3. ¿El login funciona? (devuelve un accessToken)
curl -s -X POST http://<IP_EC2>:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@fleetcore.com","password":"<contraseña_de_prueba>"}'

# 4. ¿El endpoint protegido exige token? (debe responder 401 sin token)
curl -s -o /dev/null -w "%{http_code}\n" http://<IP_EC2>:3000/vehicles
```

Dentro de la EC2:
```bash
docker compose -f docker-compose.prod.yml ps        # el contenedor debe decir "healthy"
docker logs proyecto-app --tail=50                   # últimas líneas de la API
```

Resultados esperados:

| Prueba | Resultado esperado |
| ------ | ------------------ |
| `/health` | HTTP 200 con `{"status":"ok","database":"up"}` (dentro de `data`). |
| `/docs` | Carga la página de Swagger. |
| Login con credenciales de prueba | HTTP 200 con `accessToken`. |
| `/vehicles` sin token | HTTP 401. |

---

## 6. Por qué se tomaron estas decisiones (para justificar)

| Decisión | Razón |
| -------- | ----- |
| Base de datos en **RDS**, no dentro de un contenedor | Respaldos, parches y disponibilidad administrados por AWS; los datos no dependen del contenedor. |
| RDS con **acceso público = No** | Principio de mínimo privilegio: la base solo debe recibir tráfico de la API. |
| Regla de RDS apuntando a **grupo de seguridad**, no a una IP | Funciona aunque la EC2 cambie de IP; más seguro y más mantenible. |
| **SSH y Jenkins** solo desde mi IP | Son los puertos más sensibles (administración y control del Docker de la máquina). |
| **IP elástica** | Dirección fija para la API y para Jenkins. |
| Secretos en **credenciales de Jenkins**, no en el repo | Evitar que las contraseñas queden expuestas en Git. |
| `DB_SSL=true` en AWS | RDS con PostgreSQL 15+ exige conexión cifrada. |
| Tipo **ARM (t4g)** | Menor costo. Obliga a que `bcrypt` tenga binario ARM64 (ya viene con la librería). |
| `healthcheck` + `up --wait` | Si la API no puede hablar con la base, el despliegue **falla** en vez de quedar "a medias". |
| `.env` borrado en `cleanup` | No dejar contraseñas guardadas en el disco del servidor de Jenkins. |

---

## 7. Costos y limpieza (IMPORTANTE)

**Estado actual:** la EC2 y RDS están **apagadas**. Se encenderán antes de la sustentación para verificar que todo funciona, y quedarán encendidas durante la sustentación. Recuerda que al encender la EC2 la IP elástica sigue siendo `54.197.156.6`.

Al terminar la sustentación, para no generar cobros:

1. **RDS**: detener la instancia (Actions → Stop) o eliminarla (Actions → Delete). Si la detienes, AWS la reinicia sola después de 7 días.
2. **EC2**: detener la instancia (Instance state → Stop). Si la vas a borrar, primero libera la **IP elástica** (una IP elástica sin asociar también cobra).
3. Revisar la **consola de facturación** para confirmar que no quedan recursos activos.
4. Si tienes los datos ya guardados en el repositorio y no necesitas la base, puedes eliminar RDS sin problema: `database/fleetcore.sql` reconstruye la base.

---

## 8. Problemas que tuvimos y cómo se resolvieron

| Problema | Causa | Solución |
| -------- | ----- | -------- |
| `npm ci` fallaba dentro de Docker | El `package-lock.json` se generó con **npm 11 / Node 24** y la imagen usa **Node 22 / npm 10**. Cada versión interpreta distinto las dependencias opcionales de webpack. | Regenerar el lock con Node 22. Regla: generar el lock con la misma versión de Node/npm que usa Docker y Jenkins. |
| Riesgo previsto: `bcrypt` en la EC2 ARM | La librería necesita binario compatible con ARM64 y con Alpine (musl). | `bcrypt` trae binario precompilado para Linux ARM64 con musl; por eso funciona en la imagen `node:22-alpine`. |
| Requisito de RDS: conexión cifrada | PostgreSQL 15+ exige SSL en la conexión. Sin SSL, la conexión sería rechazada. | `DB_SSL=true` y `ssl: { rejectUnauthorized: false }` en la configuración de TypeORM (cifra la conexión sin validar el certificado; suficiente para la prueba). |

---

## 9. Pendientes y riesgos (revisar antes de sustentar)

1. **`.env.example` del repositorio contiene valores reales.** Está publicado en GitHub y el historial de Git conserva lo que se subió. Acciones:
   - Reemplazar el archivo por valores ficticios: **hecho en la rama `estudio`** (la rama `main` no se modificó).
   - **Pendiente (acción tuya):** cambiar la contraseña de RDS y el **`JWT_SECRET`** en AWS, y actualizar la credencial `env-prod` en Jenkins. Según indicaste, el `.env` de producción ya tiene los valores nuevos.
   - Esto es más importante que cualquier otro pendiente, porque el repositorio es público.
2. **Evidencia de Postman con 2 fallos (56 de 58).** Las pruebas "API key correcta" y "Placa inexistente" usaban la clave `demo-key-partner-1`, pero el entorno desplegado tiene `clave1` y `clave2`. La API respondió bien (401); el fallo es de la colección, no de la API. Corregir la variable `apiKey` y volver a ejecutar sobre una base recién cargada.
3. **Recursos encendidos**: al terminar, aplicar la sección 7.
4. **Sin disparo automático** de Jenkins (solo *Build Now*).
5. **`synchronize: true`** en TypeORM: crea y ajusta tablas automáticamente. Práctico para la prueba; en producción real se usarían migraciones.

---

## 10. Datos confirmados en AWS

| Dato | Valor |
| ---- | ----- |
| Par de claves | `key-prueba` |
| Grupos de seguridad | `prueba-nestJS` (`sg-06f3d13c69f124503`), `ec2-rds-2` (`sg-035848fe3478185ba`), `ec2-rds-3` (`sg-0463c6009401d5f06`) |
| IP elástica | `54.197.156.6` |
| AMI de la EC2 | Ubuntu 24.04 LTS arm64 (`ubuntu-noble-24.04-arm64-server-20261017`) |
| Usuario SSH | `ubuntu` |
| Motor de RDS | PostgreSQL 16.15 |
| Capa gratuita (RDS) | Sí |
| Acceso público de RDS | No |
| Versiones instaladas en la EC2 | Docker 29.1.3, Docker Compose 2.40.3 |
| Disparo de Jenkins | Solo manual (*Build Now*), sin disparador automático |

Herramientas extra (Route 53, S3, Secrets Manager): no se usaron.

---

## 11. Checklist para la sustentación

- [ ] `curl http://<IP_EC2>:3000/health` responde con la base arriba.
- [ ] `/docs` (Swagger) carga desde el celular o desde otra red.
- [ ] Jenkins: último *build* en verde.
- [ ] `.env.example` sin valores reales, y contraseña de RDS y `JWT_SECRET` ya rotados.
- [ ] Colección de Postman corregida (`apiKey` = `clave1`) y resultados nuevos guardados.
- [ ] Demo preparada: login ADMIN → vehículos → crear mantenimiento → cambiar estados → endpoint externo con `x-api-key`.
- [ ] Al final, detener o eliminar EC2 y RDS, y liberar la IP elástica.
