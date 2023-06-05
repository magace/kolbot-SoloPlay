/**
*  @filename    IPHunter.js
*  @author      kolton, Mercoory
*  @desc        search for a "hot" IP and stop if the correct server is found
*  @changes     2020.01 - more beeps and movements (anti drop measure) when IP is found; overhead messages with countdown timer; logs to D2Bot console
*
*/

function iphunter() {
	let searchip = []; // I change this to hunt IPS needs to run first in solo play.
	let ip = Number(me.gameserverip.split(".")[3]);
	let timestamp = Date.now();
	FileAction.write("logs/IPHUNTER/" + me.profile + timestamp + ".txt",ip + ":" + me.ladder)  //  Local logging to d2soj.com  No one else would ever need to do this.
	me.overhead("logging ip " + ip);
	var demdat = "/w *channeldemon" + ((me.ladder > 0) ? " Ladder " : " Non-Ladder ") + ip; (Config.LocalChat.Enabled) ? say(demdat, true) : say(demdat);  //  FG newbhouse IP/Ladder info.  Why do I not have one so others can contribute to d2soj.com?
	if (searchip.indexOf(ip) > -1) {
		if (me.ladder === 0) {
            //D2Bot.printToConsole("WARNING NL IPHunter: IP found! - [" + ip + "] Game is : " + me.gamename + "//" + me.gamepassword + " Diff:" + me.diff + " Mode:" + me.ladder, 7);
           // return true;
          }
		D2Bot.printToConsole("IPHunter: IP found! - [" + ip + "] Game is : " + me.gamename + "//" + me.gamepassword, 7);
		print("IP found! - [" + ip + "] Game is : " + me.gamename + "//" + me.gamepassword);
		me.overhead(":D IP found! - [" + ip + "]");
		me.maxgametime = 999999990; // Added to override SoloPlay Chars.		
		let timestamp = Date.now();
		FileAction.write("logs/IPHUNTERGAMES/" + me.profile + timestamp + ".txt", me.profile + ":" + me.gamename + ":" + me.gamepassword + ":" + ip);	
		for (let i = 12; i > 0; i -= 1) {
			me.overhead(":D IP found! - [" + ip + "]" + (i - 1) + " beep left");
			beep(); // works if windows sounds are enabled
			delay(250);
		}

		while (true) {
			me.overhead(":D IP found! - [" + ip + "]");
			try {
				let timestamp = Date.now();
				FileAction.write("logs/IPHUNTERGAMES/" + me.profile + timestamp + ".txt", me.profile + ":" + me.gamename + ":" + me.gamepassword + ":" + ip);  //  Keep logging to d2soj.com add my stealthbot to this later...
				Town.move("waypoint");
				delay(250);
				Town.move("stash");
				delay(250);
				sendPacket(1, 0x40);
				delay(250);
			} catch (e) {
				// ensure it doesnt leave game by failing to walk due to desyncing.
			}
			for (let i = (12 * 9); i > 0; i -= 1) {
				me.overhead(":D IP found! - [" + ip + "] Next movement in: " + i + " sec.");

				delay(1000);
			}
		}
	}
	return true;
}
