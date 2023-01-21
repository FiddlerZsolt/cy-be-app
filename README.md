# codeyard-app

User and address handler, made by [Moleculer](https://moleculer.services/) microservices framework

## Start the projects

1. Copy the `docker-compose.env.default` file and delete the ".default" at the end
2. Start Docker
3. `npm run dc:up`
4. import postman collection and environment json files for testing (the "api_key" is empty, but you get one when you log in)

The admin user initilized, use it to login:
email: admin@admin.com
password: admin

Or register a new user with normal permissions.

**Important:**
Only admin user can delete other users, and list other users' data or addresses.

---

## API endpoints

1. **POST** /login - Login
2. **GET** /logout - Logout
3. **POST** /registration
4. User handling
    - **GET** /users - List all user (admin only)
    - **GET** /user/:id - Get one user by id (admin can list everyone)
    - **GET** /users/me - Get logged user
    - **PUT** /user/:id - Update specific user
    - **DELETE** /user/:id - Delete specific user (admin only)
5. Address handling (admins can CRUD everyone's addresses, normal users only their own)
    - **GET** /user/:id/addresses - List all address from a specific user
    - **POST** /user/:id/addresses - Add new address to a specific user
    - **PUT** /addresses/:id - Update a specific address
    - **DELETE** /addresses/:id - Delete a specific address

## NPM scripts

- `npm run dc:up`: Start the stack with Docker Compose
- `npm run dc:down`: Stop the stack with Docker Compose

Sources:

- [CodeYard Factory Backend API fejlesztés playlist on youtube](https://www.youtube.com/playlist?list=PLUaiqyIGasMbDaFUywmVxfOetrPLBbSS4)
- [Moleculer Docs](https://moleculer.services/docs/0.14/)
