import { DataSource } from "typeorm";
import { database } from "../config/config.json";
import { NonceCoolDown } from "./noncecooldown";
import { UserCoolDown } from "./usercooldown";
import "reflect-metadata";

const name: string = process.env.DB_USERNAME as string;
const pwd: string = process.env.DB_PASSWORD as string;
console.log(">>>>>>>> DataSource >>>>>>>>", name, pwd);

export const Source = new DataSource({
	type: "postgres",
	host: database.host,
	port: database.port,
	username: name,
	password: pwd,
	database: database.database,
	synchronize: true,
	logging: false,
	entities: [UserCoolDown, NonceCoolDown],
	subscribers: [],
	migrations: [],
});
