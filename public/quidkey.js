const quidkeyFrameContainer = document.getElementsByClassName(
	"quidkey-element-container",
)[0];
const quidkeyFrame = quidkeyFrameContainer.querySelector("iframe");

window.addEventListener("message", (event) => {
	let quidkeyOrigin = null;

	try {
		quidkeyOrigin = new URL(quidkeyFrame.src).origin;
	} catch (_) {
		// ignore
	}

	// ignore alien messages
	if (
		!quidkeyOrigin ||
		event.origin !== quidkeyOrigin ||
		event.data.type !== "quidkey-state-update"
	)
		return;

	switch (event.data.isListOpen) {
		case true:
			quidkeyFrameContainer.classList.add("quidkey-bank-set-open");
			break;
		case false:
			quidkeyFrameContainer.classList.remove("quidkey-bank-set-open");
			break;
	}
});
