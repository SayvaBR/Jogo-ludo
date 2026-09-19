extends SceneTree
const Rules = preload("res://scripts/rules.gd")
const Board = preload("res://scripts/board_data.gd")
var checked := 0
var failures := 0

func check(ok: bool, title: String) -> void:
	checked += 1
	if not ok:
		failures += 1
		printerr("FAIL: " + title)

func _initialize() -> void:
	var g := Rules.new_game(2)
	check(g["seats"] == [0,2], "two opposite players")
	check(g["pieces"].size() == 4 and g["pieces"][0].size() == 4, "four tokens per player")
	check(Board.TRACK_CELLS.size() == 52, "52 track cells")
	var distinct := {}
	for cell in Board.TRACK_CELLS:
		distinct[cell] = true
	check(distinct.size() == 52, "track does not overlap")
	check(Rules.global_square(1,0) == 13 and Rules.global_square(2,51) == 25, "rotated positions")
	check(Rules.legal_moves(g,2).is_empty(), "needs six to leave yard")
	check(Rules.legal_moves(g,6).size() == 4, "all four tokens can leave")
	check(not Rules.move(g,0)["ok"], "reject movement before rolling")
	check(Rules.roll(g,6)["ok"], "accept roll")
	check(g["phase"] == "choose", "classic moves before rolling again")
	check(Rules.move(g,0)["ok"] and g["pieces"][0][0] == 0, "start token")
	check(g["current"] == 0 and g["phase"] == "roll", "extra roll on six")
	Rules.roll(g,6)
	Rules.move(g,0)
	check(g["pieces"][0][0] == 6, "six advances six cells")
	check(Rules.roll(g,6)["event"] == "third_six", "third consecutive six ends turn")
	check(g["current"] == 2 and g["pieces"][0][0] == 6, "prior legal moves persist")
	var bank := Rules.new_game(2,false,true)
	check(Rules.roll(bank,6)["event"] == "banked_six", "accumulate six option")
	check(bank["phase"] == "roll" and bank["bank"] == [6], "roll another before moving")
	Rules.roll(bank,6)
	check(bank["bank"] == [6,6], "two queued sixes")
	check(Rules.roll(bank,6)["event"] == "third_six" and bank["bank"].is_empty(), "third six cancels queue")
	var queued := Rules.new_game(2,false,true)
	Rules.roll(queued,6)
	Rules.roll(queued,2)
	check(queued["bank"] == [6,2] and queued["die"] == 6, "FIFO roll order")
	Rules.move(queued,0)
	check(queued["phase"] == "choose" and queued["die"] == 2, "consume next die")
	Rules.move(queued,0)
	check(queued["pieces"][0][0] == 2 and queued["current"] == 2, "queue completes")
	var safe := Rules.new_game(2)
	safe["pieces"][2][0] = 26 # yellow position 26 is red starting square 0
	safe["phase"] = "choose"
	safe["die"] = 6
	var safe_result: Dictionary = Rules.move(safe,0)
	check(safe_result["captured"].is_empty() and safe["pieces"][2][0] == 26, "safe start square prevents capture")
	var capture := Rules.new_game(2)
	capture["pieces"][0][0] = 13
	capture["pieces"][2][1] = 40 # yellow global (26+40)%52 = 14
	capture["phase"] = "choose"
	capture["die"] = 1
	check(Rules.move(capture,0)["event"] == "capture", "capture event")
	check(capture["pieces"][2][1] == -1, "opponent returned to yard")
	var finish := Rules.new_game(2)
	finish["pieces"][0][0] = 56
	check(not Rules.legal_moves(finish,2).has(0), "cannot overshoot finish")
	check(Rules.legal_moves(finish,1).has(0), "exact finish legal")
	finish["pieces"][0] = [56,57,57,57]
	finish["phase"] = "choose"
	finish["die"] = 1
	check(Rules.move(finish,0)["event"] == "win", "four completed tokens win")
	check(finish["phase"] == "finished" and finish["winner"] == 0, "game completed")
	check(not Rules.roll(finish,6)["ok"], "cannot roll after game")
	var skip := Rules.new_game(3)
	Rules.roll(skip,1)
	check(skip["current"] == 1, "skip player without moves")
	var cpu := Rules.new_game(4,true)
	cpu["current"] = 1
	cpu["turn_index"] = 1
	cpu["phase"] = "choose"
	cpu["die"] = 6
	check(Rules.legal_moves(cpu).has(Rules.best_cpu_move(cpu)), "CPU legal decision")
	check(Rules.valid_save(cpu), "valid state accepted")
	cpu["pieces"][0][0] = 100
	check(not Rules.valid_save(cpu), "reject invalid save")
	print("LUDO RULES: %d checks, %d failures" % [checked,failures])
	quit(1 if failures > 0 else 0)