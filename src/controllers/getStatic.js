module.exports = {
	getStatic: (_, res) => {
		res.sendFile("index.html", { root: __dirname + "/../../public" }, (err) => {
			if (err) {
				console.error("Error sending index.html:", err);
				res.status(500).send("Error loading page");
			}
		});
	},
};
