import { Source } from "./source";

export const InitializeDb = (): void => {
	Source.initialize()
		.then(async () => {
			console.log("Database Connection Established");
		})
		.catch(error => {
			console.log(error);
		});
};

export { Source };
