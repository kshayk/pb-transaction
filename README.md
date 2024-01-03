# Paybox Transaction Service
In this service, users will be able to send money transfer requests along with accepting and  denying these requests.

This service handles the API requests from the app itself (as an improvement, the app requests should be centralized in an app service),
saving the relevant data in MongoDB, and utilizing RabbitMQ in order to user the notifications service.

### Endpoints:
* POST /transfer - create a new transfer request
* POST /reject-transfer - reject a transfer request
* POST /accept-transfer - accept a transfer request

## How to start the server
1. Clone the project and the docker compose project that contains all the relevant services: https://github.com/kshayk/pb-docker
2. Run the docker compose project and follow its instructions in the readme file
4. run `npm install`, `npm run build` and `npm run start` in that order

Note: The server will run locally on the machine, but ideally, it should have its own Dockerfile which
will connect to the same network as the mongo and rabbitmq containers.
If run locally, use localhost in the code as the host for both mongo and rabbitmq to connect
to these services.

### Few things that i would add for a better production-ready project:
1. Move the auth logic to its own microservice
2. Move the groups into its own microservice
3. Create a data adapter which will allow us to run unit tests on a mock data instead of the actual database
4. Move the mongo transaction logic to a middleware (it didn't work when i tried and didn't want to waste time on it)
5. Use ``pm2`` instead of simple ``node`` command