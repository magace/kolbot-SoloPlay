/**
*  @filename    TownChicken.js
*  @author      theBGuy
*  @desc        TownChicken background worker thread
*
*/

/**
 * @todo 
 * - figure out how to deal with loss of reference to whatever it was we might of been targetting beforehand.
 * - How many chickens is too many for a script? How to end a script it that amount is reached.
 */
(function (module, require, Worker) {
	// Only load this in global scope
	if (getScript(true).name.toLowerCase() === "libs\\soloplay\\soloplay.js") {

		const getNearestMonster = () => {
			let gid = null;
			let monster = Game.getMonster();
			let range = 30;

			if (monster) {
				do {
					if (monster.attackable && !monster.getParent()) {
						let distance = getDistance(me, monster);

						if (distance < range) {
							[range, gid] = [distance, monster.gid];
						}
					}
				} while (monster.getNext());
			}

			gid && (Game.getMonster(-1, -1, gid));

			if (monster) {
				console.log("ÿc9TownChickenÿc0 :: Closest monster to me: " + monster.name + " | Monster classid: " + monster.classid);
				return monster.classid;
			}

			return -1;
		};
		
		const usePortal = function (targetArea, owner, unit, dummy) {
			if (targetArea && me.inArea(targetArea)) return true;

			me.cancelUIFlags();

			const townAreaCheck = (area = 0) => sdk.areas.Towns.includes(area);
			const preArea = me.area;
			const leavingTown = townAreaCheck(preArea);

			for (let i = 0; i < 13; i += 1) {
				if (me.dead) return false;
				if (targetArea ? me.inArea(targetArea) : me.area !== preArea) return true;

				(i > 0 && owner && me.inTown) && Town.move("portalspot");

				let portal = unit ? copyUnit(unit) : Pather.getPortal(targetArea, owner);

				if (portal && portal.area === me.area) {
					const useTk = me.inTown && Skill.useTK(portal) && i < 3;
					if (useTk) {
						portal.distance > 21 && (me.inTown && me.act === 5 ? Town.move("portalspot") : Pather.moveNearUnit(portal, 20));
						if (Skill.cast(sdk.skills.Telekinesis, sdk.skills.hand.Right, portal)
							&& Misc.poll(() => targetArea ? me.inArea(targetArea) : me.area !== preArea)) {
							Pather.lastPortalTick = getTickCount();
							delay(100);

							return true;
						}
					} else {
						portal.distance > 5 && (i < 3 ? Pather.moveNearUnit(portal, 4, false) : Pather.moveToUnit(portal));

						if (getTickCount() - Pather.lastPortalTick > (leavingTown ? 2500 : 1000)) {
							i < 2 ? Packet.entityInteract(portal) : Misc.click(0, 0, portal);
						} else {
							// only delay if we are in town and leaving town, don't delay if we are attempting to portal from out of town since this is the chicken thread
							// and we are likely being attacked
							leavingTown && delay(300);
							
							continue;
						}
					}

					let tick = getTickCount();

					while (getTickCount() - tick < 500) {
						if (me.area !== preArea) {
							Pather.lastPortalTick = getTickCount();
							delay(100);

							return true;
						}

						delay(10);
					}
					// try clicking dummy portal
					!!dummy && portal.area === 1 && Misc.click(0, 0, portal);

					i > 1 && (i % 3) === 0 && Packet.flash(me.gid);
				} else {
					console.log("Didn't find portal, retry: " + i);
					i > 3 && me.inTown && Town.move("portalspot", false);
					if (i === 12) {
						let p = Game.getObject("portal");
						console.debug(p);
						if (!!p && Misc.click(0, 0, p) && Misc.poll(() => me.area !== preArea, 1000, 100)) {
							Pather.lastPortalTick = getTickCount();
							delay(100);

							return true;
						}
					}
					Packet.flash(me.gid);
				}

				delay(250);
			}

			return (targetArea ? me.inArea(targetArea) : me.area !== preArea);
		};

		const makePortal = function (use = false) {
			if (me.inTown) return true;

			let oldGid = -1;

			for (let i = 0; i < 5; i += 1) {
				if (me.dead) return false;

				let tpTool = me.getTpTool();
				if (!tpTool) return false;

				let oldPortal = Game.getObject(sdk.objects.BluePortal);
				if (oldPortal) {
					do {
						if (oldPortal.getParent() === me.name) {
							oldGid = oldPortal.gid;
							break;
						}
					} while (oldPortal.getNext());
					
					// old portal is close to use, we should try to use it
					if (oldPortal.getParent() === me.name && oldPortal.distance < 4) {
						if (use) {
							if (usePortal(null, null, copyUnit(oldPortal))) return true;
							break; // don't spam usePortal
						} else {
							return copyUnit(oldPortal);
						}
					}
				}

				let pingDelay = me.getPingDelay();

				if (tpTool.use() || Game.getObject("portal")) {
					let tick = getTickCount();

					while (getTickCount() - tick < Math.max(500 + i * 100, pingDelay * 2 + 100)) {
						const portal = getUnits(sdk.unittype.Object, "portal")
							.filter((p) => p.getParent() === me.name && p.gid !== oldGid).first();

						if (portal) {
							if (use) {
								if (usePortal(null, null, copyUnit(portal))) return true;
								break; // don't spam usePortal
							} else {
								return copyUnit(portal);
							}
						} else {
							// check dummy
							let dummy = getUnits(sdk.unittype.Object, "portal").filter(p => p.name === "Dummy").first();
							if (dummy) {
								console.debug(dummy);
								if (use) return usePortal(null, null, dummy, true);
								return copyUnit(dummy);
							}
						}

						delay(10);
					}
				} else {
					console.log("Failed to use tp tool");
					Packet.flash(me.gid, pingDelay);
					delay(200 + pingDelay);
				}

				delay(40);
			}

			return false;
		};

		const goToTown = function (act = 0, wpmenu = false) {
			if (!me.inTown) {
				const townArea = sdk.areas.townOf(me.act);
				try {
					!makePortal(true) && console.warn("Town.goToTown: Failed to make TP");
					if (!me.inTown && !usePortal(townArea, me.name)) {
						console.warn("Town.goToTown: Failed to take TP");
						if (!me.inTown && !usePortal(sdk.areas.townOf(me.area))) throw new Error("Town.goToTown: Failed to take TP");
					}
				} catch (e) {
					let tpTool = me.getTpTool();
					if (!tpTool && Misc.getPlayerCount() <= 1) {
						Misc.errorReport(new Error("Town.goToTown: Failed to go to town and no tps available. Restart."));
						scriptBroadcast("quit");
					} else {
						if (!Misc.poll(() => {
							if (me.inTown) return true;
							let p = Game.getObject("portal");
							console.debug(p);
							!!p && Misc.click(0, 0, p) && delay(100);
							Misc.poll(() => me.idle, 1000, 100);
							console.debug("inTown? " + me.inTown);
							return me.inTown;
						}, 700, 100)) {
							Misc.errorReport(new Error("Town.goToTown: Failed to go to town. Quiting."));
							scriptBroadcast("quit");
						}
					}
				}
			}

			if (!act) return true;
			if (act < 1 || act > 5) throw new Error("Town.goToTown: Invalid act");
			if (act > me.highestAct) return false;

			if (act !== me.act) {
				try {
					Pather.useWaypoint(sdk.areas.townOfAct(act), wpmenu);
				} catch (WPError) {
					throw new Error("Town.goToTown: Failed use WP");
				}
			}

			return true;
		};

		const visitTown = function () {
			console.log("ÿc8Start ÿc0:: ÿc8visitTown");
		
			const preArea = me.area;
			const preAct = sdk.areas.actOf(preArea);

			if (!me.inTown && !me.getTpTool()) {
				console.warn("Can't chicken to town. Quit");
				scriptBroadcast("quit");
				return false;
			}

			let tick = getTickCount();

			// not an essential function -> handle thrown errors
			me.cancelUIFlags();
			try {
				goToTown();
			} catch (e) {
				return false;
			}

			const { x, y } = me;

			Town.doChores();

			console.debug("Current act: " + me.act + " Prev Act: " + preAct);
			me.act !== preAct && goToTown(preAct);
			Town.move("portalspot");
			Pather.moveTo(x, y);

			while (getTickCount() - tick < 4500) {
				delay(10);
			}

			if (!usePortal(preArea, me.name)) {
				try {
					usePortal(null, me.name);
				} catch (e) {
					throw new Error("Town.visitTown: Failed to go back from town");
				}
			}

			console.log("ÿc8End ÿc0:: ÿc8visitTown - currentArea: " + getAreaName(me.area));

			return me.area === preArea;
		};

		let [townCheck] = [false, false];

		me.on("townChicken", function townChickenEvent (msg) {
			if (SoloEvents.townChicken.disabled) return;
			if (typeof msg !== "string") return;
			switch (msg) {
			case "townCheck":
				switch (me.area) {
				case sdk.areas.ArreatSummit:
				case sdk.areas.UberTristram:
					console.warn("Don't tp from " + getAreaName(me.area));
					return;
				default:
					console.log("townCheck message recieved. First check passed.");
					townCheck = true;

					return;
				}
			case "quit":
				//quitFlag = true;
				// Maybe stop townChicken thread? Would that keep us from the crash that happens when we try to leave game while townChickening
				break;
			default:
				break;
			}
		});

		Misc.townCheck = function () {
			return false;
		};
		
		// const lastChickens = [];
		const useHowl = Skill.canUse(sdk.skills.Howl);
		const useTerror = Skill.canUse(sdk.skills.Terror);

		Config.DebugMode.Stack = true;
		let waitTick = getTickCount();
		let potTick = getTickCount();

		// Start
		Worker.runInBackground.TownChicken = function () {
			if (getTickCount() - waitTick < 100 || SoloEvents.townChicken.disabled) return true;
			waitTick = getTickCount();
			if (me.inTown) return true;

			let shouldChicken = (
				(townCheck || me.hpPercent < Config.TownHP || me.mpPercent < Config.TownMP)
			);

			if (shouldChicken && !me.canTpToTown()) {
				// we should probably quit?
				return true;
			}

			if (!shouldChicken) {
				if (getTickCount() - potTick < 300) return true;
				potTick = getTickCount();
				// do we need potions?
				if (!Config.TownCheck) return true;
				// can we chicken?
				if (!me.canTpToTown()) return true;
				if (me.needPotions() || (Config.OpenChests.Enabled && Town.needKeys())) {
					shouldChicken = true;
				}
			}

			if (shouldChicken) {
				let t4 = getTickCount();
				try {
					// const recentChicks = lastChickens
					// 	.slice(Math.max(lastChickens.length - 3), lastChickens.length - 1);

					// const stopCurrentScript = recentChicks.length >= 2 && recentChicks
					// 	.every(([count]) => getTickCount() - count < Time.minutes(1));

					// lastChickens.push([getTickCount(), me.area, me.x, me.y]);

					// if (stopCurrentScript) {
					// 	myPrint("ÿc8TownChicken :: ÿc0Too many chickens on this script, move to next :: " + me.gold);
					// 	goToTown();
					// 	// scriptBroadcast("nextScript");
					// 	me.emit("nextScript");
					// 	return true;
					// }

					myPrint("ÿc8TownChicken :: ÿc0Going to town. Initial Gold :: " + me.gold);
					[Attack.stopClear, SoloEvents.townChicken.running] = [true, true];
						
					// determine if this is really worth it
					if (useHowl || useTerror) {
						if ([156, 211, 242, 243, 544, 571, 345].indexOf(getNearestMonster()) === -1) {
							if (useHowl && Skill.getManaCost(130) < me.mp) {
								Skill.cast(130, sdk.skills.hand.Right);
							}

							if (useTerror && Skill.getManaCost(77) < me.mp) {
								Skill.cast(77, sdk.skills.hand.Right, getNearestMonster());
							}
						}
					}
						
					visitTown();
				} catch (e) {
					Misc.errorReport(e, "TownChicken.js");
					scriptBroadcast("quit");

					return false;
				} finally {
					Packet.flash(me.gid, 100);
					console.log("ÿc8TownChicken :: Took: " + Time.format(getTickCount() - t4) + " to visit town. Ending Gold :: " + me.gold);
					[Attack.stopClear, SoloEvents.townChicken.running, townCheck] = [false, false, false];
				}
			}

			return true;
		};

		console.log("ÿc8Kolbot-SoloPlayÿc0: Start TownChicken");
	}
})(module, require, typeof Worker === "object" && Worker || require("../../modules/Worker"));