# FleetCore API – Fleet maintenance management

REST API built with **NestJS, TypeScript, TypeORM, PostgreSQL and JWT** to manage the
maintenance of a vehicle fleet (vehicles, mechanics, workshops and maintenances).
Performance test – Module 6.2 NestJS.

**Coder:** Laura Neira – **Clan:** Magdalena

## Tech stack

- Node.js 22, NestJS 11, TypeScript
- TypeORM + PostgreSQL 16
- JWT (`@nestjs/jwt`) and bcrypt for password hashing
- class-validator / class-transformer for DTO validation
- Swagger (`@nestjs/swagger`)
- Docker and Docker Compose (extra points), Jenkins and AWS (EC2 + RDS) for the deployment

## Swagger documentation

- Local: <http://localhost:3000/docs>
- AWS: <http://54.197.156.6:3000/docs>

Use **Authorize** to send the JWT (`Bearer`) or the `x-api-key` header.

## Project structure

| Folder | What it contains |
| ------ | ---------------- |
| `src/auth/` | Register, login, JWT guard, roles guard, API key guard and the custom decorators (`@Public`, `@Roles`, `@CurrentUser`) |
| `src/users/` | User entity and service |
| `src/vehicles/`, `src/mechanics/`, `src/workshops/` | Modules with controller, service, entity and DTOs |
| `src/maintenances/` | Maintenances, business rules, state transitions and the external (API key) endpoint |
| `src/common/` | Global exception filter and response interceptor |
| `src/seeds/seed.ts` | Seeder (idempotent) |
| `database/fleetcore.sql` | SQL dump (structure + seeded data) |
| `docs/` | Postman collection, Postman test run result and screenshots (`docs/IMG/`) as test evidence |
| `Dockerfile`, `docker-compose.yml` | Docker: API + PostgreSQL (volume and internal network) |
| `docker-compose.prod.yml`, `Jenkinsfile`, `jenkins/` | AWS deployment (API only, database is RDS) |

## Environment variables

Copy `.env.example` to `.env` and adjust it.

| Variable | Description |
| -------- | ----------- |
| `PORT` | Port where the API runs. |
| `DB_HOST` | PostgreSQL host: `localhost` locally, the RDS **endpoint** on AWS. |
| `DB_PORT` | PostgreSQL port (`5432`). |
| `DB_USER` / `DB_PASSWORD` | PostgreSQL credentials. |
| `DB_NAME` | Database name. |
| `DB_SSL` | `false` locally. `true` on RDS (PostgreSQL 15+ requires encryption). |
| `JWT_SECRET` | Secret used to sign the tokens. |
| `JWT_EXPIRES_IN` | Token lifetime, for example `1h`. |
| `API_KEYS` | Valid API keys for the external endpoint, separated by commas. |

## Installation and execution

### Option A – With Docker (API + PostgreSQL)

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec app npm run seed:prod
```

The compose file creates a volume (`db_data`) for the data and an internal network
(`fleetcore-net`) shared by the API and the database. Stop it with `docker compose down`
(add `-v` to also delete the data).

### Option B – Without Docker for the API

```bash
cp .env.example .env
docker compose up -d db      # only PostgreSQL
npm install
npm run seed
npm run start:dev
```

## Seeder

```bash
npm run seed         # local (ts-node)
npm run seed:prod    # compiled code (inside the Docker container)
```

It can be executed several times: each record is searched before being created, so nothing is duplicated.

| Data | Quantity |
| ---- | -------- |
| Users | 1 ADMIN, 2 TECHNICIAN |
| Mechanics | 3 (2 active, linked to the technicians; 1 inactive) |
| Workshops | 2 (1 active, 1 inactive) |
| Vehicles | 4 (`ABC123` and `DEF456` AVAILABLE, `GHI789` IN_MAINTENANCE, `JKL012` INACTIVE) |
| Maintenances | 1 COMPLETED (`ABC123`) and 1 IN_PROGRESS (`GHI789`) |

### Test credentials

| Role | Email | Password |
| ---- | ----- | -------- |
| ADMIN | `admin@fleetcore.com` | `Admin123*` |
| TECHNICIAN (Carlos, mechanic 1) | `tecnico1@fleetcore.com` | `Tecnico123*` |
| TECHNICIAN (Laura, mechanic 2) | `tecnico2@fleetcore.com` | `Tecnico123*` |

API keys for the external endpoint: the ones written in `API_KEYS` (`demo-key-partner-1` in `.env.example`).

## Endpoints

Every route requires a JWT except the ones marked as public. Responses always use the same format:

```json
{ "success": true, "statusCode": 200, "data": {}, "timestamp": "2026-10-27T13:00:00.000Z" }
```

and errors:

```json
{ "success": false, "statusCode": 409, "message": "...", "path": "/maintenances", "timestamp": "..." }
```

| Method and route | Who | Description |
| ---------------- | --- | ----------- |
| `POST /auth/register` | Public | Register a user (`ADMIN` or `TECHNICIAN`) |
| `POST /auth/login` | Public | Login, returns the JWT |
| `GET /health` | Public | API and database status |
| `POST /vehicles` | ADMIN | Create a vehicle (unique plate) |
| `GET /vehicles` | ADMIN | List vehicles |
| `GET /vehicles/:id` · `GET /vehicles/plate/:plate` | ADMIN | Get a vehicle by id or plate |
| `PATCH /vehicles/:id` | ADMIN | Update a vehicle |
| `DELETE /vehicles/:id` | ADMIN | Logical deletion: the vehicle becomes `INACTIVE` |
| `POST /mechanics` · `GET /mechanics` · `GET /mechanics/:id` · `PATCH /mechanics/:id` | ADMIN | Manage mechanics |
| `PATCH /mechanics/:id/status` | ADMIN | Activate / deactivate (`{ "isActive": false }`) |
| `POST /workshops` · `PATCH /workshops/:id/status` | ADMIN | Create / activate / deactivate workshops |
| `GET /workshops` · `GET /workshops/:id` | Any user | Active workshops / one workshop |
| `POST /maintenances` | ADMIN | Create a maintenance (starts as `SCHEDULED`) |
| `GET /maintenances` · `/active` | ADMIN | All / active (`SCHEDULED`, `IN_PROGRESS`) |
| `GET /maintenances/vehicle/:vehicleId` · `/vehicle/:vehicleId/history` | ADMIN | By vehicle / history (`COMPLETED`) |
| `GET /maintenances/mechanic/:mechanicId` | ADMIN | Assigned to a mechanic |
| `GET /maintenances/my` | TECHNICIAN | Maintenances assigned to the logged technician (with workshop) |
| `PATCH /maintenances/:id/status` | ADMIN, TECHNICIAN | Change the status (a technician only on his own maintenances) |
| `GET /external/vehicles/:plate/maintenances` | `x-api-key` | Vehicle history for external integrations |

### Business rules implemented

- The vehicle, mechanic and workshop must exist; the mechanic and workshop must be active; an `INACTIVE` vehicle cannot receive maintenances.
- A vehicle can have only one active maintenance (`SCHEDULED` or `IN_PROGRESS`).
- A mechanic cannot have overlapping schedules in any workshop (a maintenance starting exactly when another ends is allowed) and cannot have two `IN_PROGRESS` maintenances at the same time.
- The mileage cannot be lower than the current mileage of the vehicle.
- Allowed transitions: `SCHEDULED → IN_PROGRESS | CANCELLED` and `IN_PROGRESS → COMPLETED | CANCELLED`. `COMPLETED` and `CANCELLED` are final (HTTP 409 otherwise).
- `IN_PROGRESS` sets the vehicle to `IN_MAINTENANCE`; `COMPLETED` (or cancelling an `IN_PROGRESS` one) sets it back to `AVAILABLE`. The state change and the vehicle update run in one database **transaction**.
- To complete a maintenance, `workDone`, `cost`, `finishedAt` and `finalMileage` are required (HTTP 400 otherwise).

## Quick test with curl

```bash
# 1. Login and keep the token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@fleetcore.com","password":"Admin123*"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')

# 2. Private route with the token
curl -s http://localhost:3000/vehicles -H "Authorization: Bearer $TOKEN"

# 3. External endpoint with API key
curl -s http://localhost:3000/external/vehicles/ABC123/maintenances -H 'x-api-key: demo-key-partner-1'
```

## Test evidence

The main scenarios were tested with **Postman**. Everything is inside the `docs/` folder:

| File | What it is |
| ---- | ---------- |
| `docs/fleetcore.postman_collection.json` | Postman collection with 58 requests. Each one checks its expected HTTP code and the logins save the tokens automatically. |
| `docs/FleetCore API.postman_test_run.json` | Result of running the whole collection (all tests passed). |
| `docs/IMG/` | Screenshot of Postman running the collection. |

To run the collection yourself, import the `.json` file in Postman (the `baseUrl` variable is `http://localhost:3000`,
change it to test on AWS) and use **Collection Runner**. Run it on a freshly seeded database: it creates and changes
data, so reset and run the seeder again before running it twice.

The scenarios covered are: authentication (register, login, invalid token), roles (ADMIN / TECHNICIAN),
validations, business rules (inactive vehicle, mechanic or workshop, schedule overlaps, mileage), state
transitions and the `x-api-key` endpoint.

## Database dump

`database/fleetcore.sql` has the structure and the seeded data. To load it into an empty database:

```bash
psql -h localhost -U postgres -d proyecto -f database/fleetcore.sql
```

## Deploy on AWS (EC2 + RDS + Jenkins)

The infrastructure is already created and connected; the steps are only a summary:

1. **EC2** with Docker; **RDS** PostgreSQL (port 5432 open only from the EC2 security group).
2. **Jenkins** (in a container on the same EC2):

   ```bash
   docker compose -f jenkins/docker-compose.yml up -d --build
   docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```

3. In Jenkins, a **Secret file** credential with ID `env-prod` holds the production `.env`
   (`DB_HOST` = RDS endpoint, `DB_SSL=true`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `API_KEYS`...).
   It must contain **all** the variables of `.env.example`.
4. Run the `prueba-nestJS` job with **Build Now**: the pipeline builds the image and starts the container.
5. Load the initial data once on the EC2:

   ```bash
   docker exec proyecto-app npm run seed:prod
   ```


