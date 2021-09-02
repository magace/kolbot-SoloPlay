/*
*	@filename	ancients.js
*	@author		isid0re
*	@desc		ancients quest
*/

function ancients () {
	let canAncients = function () { // ancients resists
		let ancient = getUnit(1);

		if (ancient) {
			do {
				if (!ancient.getParent() && !Attack.canAttack(ancient)) {
					return false;
				}
			} while (ancient.getNext());
		}

		return true;
	};

	let touchAltar = function () { // touch altar
		let tick = getTickCount();

		while (getTickCount() - tick < 5000) {
			if (getUnit(2, 546)) {
				break;
			}

			delay(20 + me.ping);
		}

		let altar = getUnit(2, 546);

		if (altar) {
			while (altar.mode !== 2) {
				Pather.moveToUnit(altar);
				altar.interact();
				delay(200 + me.ping);
				me.cancel();
			}

			return true;
		}

		return false;
	};

	let ancientsPrep = function () { // ancients prep
		Town.goToTown(); // prep to revised settings
		Town.fillTome(518);
		Town.buyPots(10, "Thawing");
		Town.drinkPots();
		Town.buyPots(10, "Antidote");
		Town.drinkPots();
		Town.buyPotions();
		Pather.usePortal(120, me.name);
	};

	Town.townTasks();
	print('ÿc8Kolbot-SoloPlayÿc0: starting ancients');
	me.overhead("ancients");

	if (!Pather.checkWP(118)) {
		Pather.getWP(118);
	} else {
		Pather.useWaypoint(118);
	}

	Precast.doPrecast(true);
	Pather.moveToExit(120, true); // enter at ancients plateau
	let tempConfig = Misc.copy(Config); // save and update config settings
	let updateConfig = {
		TownCheck: false,
		MercWatch: false,
		HealStatus: false,
		TownHP: 0,
		TownMP: 0,
		MPBuffer: 15,
		HPBuffer: 15,
		UseMercRejuv: 25,
		LifeChicken: 5,
		ManaChicken: 0,
		MercChicken: 0
	};

	Town.townTasks();
	me.overhead('updated settings');
	Object.assign(Config, updateConfig);
	Town.buyPots(10, "Thawing"); // prep to revised settings
	Town.drinkPots();
	Town.buyPots(10, "Antidote");
	Town.drinkPots();
	Town.buyPotions();
	Pather.usePortal(120, me.name);
	Precast.doPrecast(true);

	if (!Pather.moveToPreset(me.area, 2, 546)) { // move to altar
		print("ÿc8Kolbot-SoloPlayÿc0: Failed to move to ancients' altar");
	}

	touchAltar(); //activate altar

	while (!getUnit(1, 541)) { //wait for ancients to spawn
		delay(250 + me.ping);
	}

	while (!canAncients()) {// reroll ancients if unable to attack
		Pather.makePortal(true);
		ancientsPrep();
		Pather.usePortal(120, me.name);
		touchAltar();

		while (!getUnit(1, 542)) {
			delay(10 + me.ping);
		}
	}

	for (let i = 0; i < 3 && !me.ancients; i++) {
		Attack.clear(50);
		Pather.moveTo(10048, 12628);

		if (!Misc.checkQuest(39, 0)) {
			me.overhead("Failed to kill anicents. Attempt: " + i);
			touchAltar(); //activate altar
		}
	}
	
	me.cancel();
	me.overhead('restored settings');
	Object.assign(Config, tempConfig);
	Precast.doPrecast(true);

	try {
		if (Misc.checkQuest(39, 0)) {
			Pather.clearToExit(120, 128, true);
			Pather.clearToExit(128, 129, true);
			Pather.getWP(129);
		}
	} catch (err) {
		print('ÿc8Kolbot-SoloPlayÿc0: Cleared Ancients. Failed to get WSK Waypoint');
	}

	return true;
}