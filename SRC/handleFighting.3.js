function validateTarget(target) {
	if (attackToggle
		&& target
		&& target.visible
		&& is_monster(target)
		&& parent.entities[target.id]
		&& is_in_range(target, "attack")
		&& (can_move_to(target) || is_in_range(target, "attack"))
		&& !target.dead
		&& target !== null
		//New, experimental distance measuring
		&& distance(character, farmingSpotData) < farmingSpotMaxDist
		&& distance(target, farmingSpotData) < farmingSpotMaxDist) {
		return true;
	} else {
		return false;
	}
}

//Only use skill when necessary
function validateOffensiveSkill(target, manaReserve) {
	if (attackToggle
		&& target
		&& target.level > 1
		&& requiresMaster.includes(target.mtype)
		&& character.mp > (character.max_mp * manaReserve)) return true;
}

function getTarget() {

	//If the character already has a valid target, attack it
	let target = get_targeted_monster();
	if (validateTarget(target)) {
		return target;
	} else {
		change_target(null);
	}
	//If there is no master, or character is master, choose target freely
	if ((!master && !target) || character.name === master) {
		//Returns any monster that targets any party-member
		for (const partyMember of parent.party_list) {
			target = get_nearest_monster({
				target: partyMember
			});
			if (validateTarget(target)) {
				//log("Targeting monster that attacks party-member");
				change_target(target);
				return target;
			}
		}

		//Looks for special monsters
		//"Object.values(parent.entities)" returns an array, we only want index 0
		target = Object.values(parent.entities).filter(entity => specialMonsters.includes(entity.mtype) && is_in_range(entity, "attack"))[0];
		if (validateTarget(target)) {
			change_target(target);
			return target;
		}

		//Returns a monster of farmMonsterType that targets nobody
		target = get_nearest_monster({
			type: farmMonsterType,
			no_target: true
		});
		if (validateTarget(target)) {
			//log("Target monster that targets nobody");
			change_target(target);
			return target;
		}

		//If there is a master, target masters target
	} else if (master
		&& get_player(master)
		&& get_player(master).target
		&& character.name !== master) {
		/*
		get_player(master).target only returns the target ID,
		NOT the ENTITY (Object)!
		We therefor have to search parent.entities[] for the target ID,
		which will return an ENTITY (Object) again!
		The upper part works, because get_nearest_monster()
		returns ENTITIES, too!
		*/
		target = parent.entities[get_player(master).target];
		if (validateTarget(target)) {
			//log("Target master's target");
			change_target(target);
			return target;
		}
	} else {
		change_target(null);
		return null;
	}
}

function autoFight(target) {
	if (validateTarget(target)) {
		if (!is_in_range(target, "attack")) {
			xmove(
				character.x + Math.floor((target.x - character.x) * 0.3),
				character.y + Math.floor((target.y - character.y) * 0.3)
			);
		}
		else if (character.mp >= character.mp_cost
			&& !is_on_cooldown("attack")) {
			attack(target).then((message) => {
				//Old Lag-Compensation
				//reduce_cooldown("attack", character.ping);
				//New Lag-Compensation
				reduce_cooldown("attack", Math.min(...parent.pings));
			}).catch((message) => {
				//log(`Attack failed: ${message.reason}`);
			});
		}
	}
}

//Scare Monster away if HP are low
function scareMonsters() {
	const mainOrb = "orbg";
	const rareMonsters = ["greenjr", "grinch"];
	const attackingMonster = get_nearest_monster({ target: character.name });
	if (attackingMonster
		&& !attackingMonster?.immune
		//If not attacking, scare
		&& (!attackToggle
			//If multiple monsters are attacking, scare
			|| (Object.values(parent.entities).filter(e => e.type === "monster").filter(e => e.target === character.name).length >= 2
				//If the attacking monster isn't farmed, scare...
				|| (attackingMonster?.mtype !== farmMonsterType
					//...except if it's a rare monster
					&& !rareMonsters.includes(attackingMonster?.mtype))
				//If the character is a merchant, scare
				|| character.ctype === "merchant"
				//If the HP are lower that the monster's attack times 3,
				//or if the characters HP are below 30%
				//or if the characters MP are low
				|| (character.hp <= attackingMonster?.attack * 3
					|| character.hp <= (character.max_hp * 0.5)
					|| character.mp <= (character.max_mp * 0.3)
					|| character.mp <= (G.skills.scare.mp * 5))))
		&& character.mp >= G.skills.scare.mp
		&& !is_on_cooldown("scare")) {
		if (character.slots.orb?.name !== "jacko" && locate_item("jacko") !== -1) equip(locate_item("jacko"));
		use_skill("scare");
		game_log("Scared monsters");
		//Stop attacking monsters
		attackToggle = false;
		//Equip main Orb
	} else if ((character.hp > (character.max_hp * 0.5)
		&& character.mp > G.skills.scare.mp * 5)
		&& character.slots.orb?.name === "jacko"
		&& locate_item(mainOrb) !== -1) {
		equip(locate_item(mainOrb));
	}
}