extends SceneTree

const Rules = preload("res://scripts/rules.gd")
var failures := 0
var assertions := 0

func verify(condition: bool, description: String) -> void:
	assertions += 1
	if not condition:
		failures += 1
		printerr("SMOKE FAIL: " + description)

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene: PackedScene = load("res://main.tscn")
	verify(scene != null, "main scene loads")
	if scene == null:
		quit(1)
		return
	var app = scene.instantiate()
	get_root().add_child(app)
	await process_frame
	verify(app.menu_screen != null and app.board != null, "menu and board constructed")
	verify(app.in_menu and app.menu_screen.visible, "main menu initially visible")
	app.reduced_motion = true
	app._start_game(2,false)
	verify(not app.in_menu and not app.match_screen.visible == false, "match screen shown")
	verify(app.game["seats"] == [0,2], "two-player mode created")
	verify(app.dice_button.text == "LANÇAR DADO", "roll button available")
	app.game["phase"] = "choose"
	app.game["die"] = 6
	app._refresh()
	verify(app.board.selectable.size() == 4, "four selectable pieces highlighted")
	app._on_piece(0)
	verify(app.game["pieces"][0][0] == 0, "touch interaction moves token from base")
	verify(not app.animating and app.game["phase"] == "roll", "reduced animation returns to roll")
	app._show_menu()
	verify(app.in_menu and app.menu_screen.resume_button.visible, "resume action appears after autosave")
	app._resume()
	verify(not app.in_menu and app.game["pieces"][0][0] == 0, "autosave restores position")
	app._show_menu()
	app._start_game(4,true)
	verify(app.game["cpu"].size() == 3, "three CPU opponents created")
	verify(app.game["seats"].size() == 4, "four-player match created")
	print("LUDO SMOKE: %d checks, %d failures" % [assertions, failures])
	app.queue_free()
	quit(1 if failures > 0 else 0)