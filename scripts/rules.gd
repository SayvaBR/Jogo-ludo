class_name LudoRules
extends RefCounted

## OUT=-1; 0..51 pista; 52..56 reta final; 57 chegada.
const OUT := -1
const HOME := 57
const TRACK := 52
const STARTS := [0, 13, 26, 39]
const SAFE := [0, 8, 13, 21, 26, 34, 39, 47]
const LABELS := ["Vermelho", "Azul", "Amarelo", "Verde"]

static func new_game(players: int = 4, versus_cpu: bool = false, bank_sixes: bool = false) -> Dictionary:
	players = clampi(players, 2, 4)
	var seats: Array = [0, 2] if players == 2 else ([0, 1, 2] if players == 3 else [0, 1, 2, 3])
	var pieces: Array = []
	for color in range(4):
		pieces.append([OUT, OUT, OUT, OUT])
	var cpu: Array = []
	if versus_cpu:
		for i in range(1, seats.size()):
			cpu.append(seats[i])
	return {"version": 1, "seats": seats, "pieces": pieces, "cpu": cpu, "bank_sixes": bank_sixes, "current": seats[0], "turn_index": 0, "phase": "roll", "die": 0, "six_streak": 0, "bank": [], "winner": -1, "message": "Toque no dado para começar.", "move_count": 0}

static func global_square(color: int, progress: int) -> int:
	if progress < 0 or progress >= TRACK:
		return -1
	return (STARTS[color] + progress) % TRACK

static func is_safe(color: int, progress: int) -> bool:
	return progress >= 0 and progress < TRACK and SAFE.has(global_square(color, progress))

static func legal_moves(state: Dictionary, die: int = 0) -> Array:
	if die == 0:
		die = int(state["die"])
	var moves: Array = []
	if die < 1 or die > 6 or state["winner"] != -1:
		return moves
	var color: int = state["current"]
	for token in range(4):
		var position: int = state["pieces"][color][token]
		if position == OUT and die == 6:
			moves.append(token)
		elif position >= 0 and position < HOME and position + die <= HOME:
			moves.append(token)
	return moves

static func roll(state: Dictionary, value: int) -> Dictionary:
	if state["phase"] != "roll" or value < 1 or value > 6 or state["winner"] != -1:
		return {"ok": false, "reason": "roll_not_allowed"}
	state["die"] = value
	state["six_streak"] = int(state["six_streak"]) + 1 if value == 6 else 0
	if state["six_streak"] >= 3:
		state["bank"] = []
		advance_turn(state)
		state["message"] = "Três 6 seguidos! Vez encerrada."
		return {"ok": true, "event": "third_six"}
	if state["bank_sixes"]:
		state["bank"].append(value)
		if value == 6:
			state["message"] = "6! Role novamente ou use seus dados depois."
			return {"ok": true, "event": "banked_six"}
		return _consume_bank(state)
	state["phase"] = "choose"
	if legal_moves(state).is_empty():
		if value == 6:
			state["phase"] = "roll"
			state["message"] = "Sem movimento disponível. Jogue outra vez pelo 6."
		else:
			advance_turn(state)
			state["message"] = "Sem movimentos. Próximo jogador."
		return {"ok": true, "event": "no_moves"}
	state["message"] = "Escolha um peão destacado."
	return {"ok": true, "event": "choose"}

static func _consume_bank(state: Dictionary) -> Dictionary:
	while not state["bank"].is_empty():
		state["die"] = int(state["bank"][0])
		if not legal_moves(state).is_empty():
			state["phase"] = "choose"
			state["message"] = "Use o dado %d: escolha um peão." % state["die"]
			return {"ok": true, "event": "choose"}
		state["bank"].pop_front()
	advance_turn(state)
	state["message"] = "Dados utilizados. Próximo jogador."
	return {"ok": true, "event": "no_moves"}

static func move(state: Dictionary, token: int) -> Dictionary:
	if state["phase"] != "choose" or not legal_moves(state).has(token):
		return {"ok": false, "reason": "illegal_move"}
	var color: int = state["current"]
	var old: int = state["pieces"][color][token]
	var value: int = state["die"]
	var target: int = 0 if old == OUT else old + value
	state["pieces"][color][token] = target
	state["move_count"] = int(state["move_count"]) + 1
	var captured: Array = []
	if target < TRACK and not is_safe(color, target):
		var landing: int = global_square(color, target)
		for opponent in state["seats"]:
			if opponent == color:
				continue
			for opponent_token in range(4):
				var opponent_progress: int = state["pieces"][opponent][opponent_token]
				if global_square(opponent, opponent_progress) == landing:
					state["pieces"][opponent][opponent_token] = OUT
					captured.append([opponent, opponent_token])
	var finished: bool = target == HOME
	if finished and state["pieces"][color].all(func(p): return p == HOME):
		state["winner"] = color
		state["phase"] = "finished"
		state["bank"] = []
		state["message"] = "%s venceu!" % LABELS[color]
	elif state["bank_sixes"]:
		state["bank"].pop_front()
		_consume_bank(state)
	elif value == 6:
		state["phase"] = "roll"
		state["message"] = "6! Você joga novamente."
	else:
		advance_turn(state)
		state["message"] = "Vez de %s." % LABELS[state["current"]]
	return {"ok": true, "event": "win" if state["winner"] != -1 else ("capture" if not captured.is_empty() else ("finish" if finished else "move")), "color": color, "token": token, "from": old, "to": target, "captured": captured}

static func advance_turn(state: Dictionary) -> void:
	state["turn_index"] = (int(state["turn_index"]) + 1) % state["seats"].size()
	state["current"] = state["seats"][state["turn_index"]]
	state["phase"] = "roll"
	state["die"] = 0
	state["six_streak"] = 0
	state["bank"] = []

static func best_cpu_move(state: Dictionary) -> int:
	var options: Array = legal_moves(state)
	if options.is_empty():
		return -1
	var color: int = state["current"]
	var chosen: int = options[0]
	var best: float = -INF
	for token in options:
		var old: int = state["pieces"][color][token]
		var target: int = 0 if old == OUT else old + int(state["die"])
		var score: float = float(target) * 0.12
		if old == OUT:
			score += 9.0
		if target == HOME:
			score += 35.0
		elif is_safe(color, target):
			score += 5.0
		if target < TRACK and not is_safe(color, target):
			for opponent in state["seats"]:
				if opponent == color:
					continue
				for p in state["pieces"][opponent]:
					if global_square(opponent, int(p)) == global_square(color, target):
						score += 28.0
		score -= float(token) * 0.001
		if score > best:
			best = score
			chosen = token
	return chosen

static func valid_save(state: Dictionary) -> bool:
	if not state.has("version") or int(state["version"]) != 1:
		return false
	for key in ["pieces", "seats", "current", "bank", "cpu", "bank_sixes", "turn_index", "six_streak", "winner", "message", "move_count", "die", "phase"]:
		if not state.has(key):
			return false
	if state["pieces"].size() != 4 or state["seats"].size() < 2 or state["seats"].size() > 4:
		return false
	for color in range(4):
		if state["pieces"][color].size() != 4:
			return false
		for p in state["pieces"][color]:
			if typeof(p) != TYPE_FLOAT and typeof(p) != TYPE_INT:
				return false
			if int(p) < OUT or int(p) > HOME:
				return false
	if not state["seats"].has(state["current"]) or not ["roll", "choose", "finished"].has(state["phase"]):
		return false
	if int(state["turn_index"]) < 0 or int(state["turn_index"]) >= state["seats"].size():
		return false
	if state["seats"][int(state["turn_index"])] != state["current"]:
		return false
	if int(state["die"]) < 0 or int(state["die"]) > 6:
		return false
	return true