import WhatsappInstance from "./whatsapp";
import "dotenv/config";
import prisma from "./prisma";

class WhatsappInstances {
	public instances: Array<WhatsappInstance> = [];

	constructor() {
		const { REQUEST_URL } = process.env;

		prisma.instance
			.findMany({
				include: {
					AutomaticMessage: true,
					BlockedNumber: true,
					Client: {
						select: {
							name: true,
							isActive: true,
							Database: true
						}
					},
					Message: {
						where: {
							isMessageSync: false
						}
					}
				},
				where: {
					isActive: true,
					Client: {
						isActive: true
					}
				}
			})
			.then(async (instances) => {
				this.instances = await Promise.all(
					instances.map(async (i) => {
						const connectionProps = i.Client?.Database && {
							host: i.Client.Database.host,
							port: i.Client.Database.port,
							user: i.Client.Database.user,
							password: i.Client.Database.password,
							database: i.Client.Database.database
						};

						return new WhatsappInstance(
							i.clientName,
							i.name,
							REQUEST_URL?.replace(":clientName", i.clientName) || "",
							i.BlockedNumber.map((b) => b.number),
							i.AutomaticMessage,
							i.Message,
							connectionProps
						);
					})
				);
			});
	}

	public find(number: string) {
		return this.instances.find((i) => i.name == number);
	}
}

const instances = new WhatsappInstances();

export default instances;
