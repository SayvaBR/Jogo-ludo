extends "res://scripts/game_view.gd"

func _start_game(count: int, cpu: bool) -> void:
	game = Rules.new_game(count,cpu,menu_screen.bank_enabled)
	_save()
	_show_match()

func _resume() -> void:
	if not FileAccess.file_exists(SAVE):
		return
	var file := FileAccess.open(SAVE,FileAccess.READ)
	if file == null:
		return
	var loaded = JSON.parse_string(file.get_as_text())
	if typeof(loaded) != TYPE_DICTIONARY or not Rules.valid_save(loaded):
		return
	game = loaded
	menu_screen.set_bank_rule(bool(game["bank_sixes"]))
	_show_match()

func _save() -> void:
	if game.is_empty():
		return
	var file := FileAccess.open(SAVE,FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(game))

func _refresh() -> void:
	if in_menu or game.is_empty():
		return
	var color: int = game["current"]
	var winner: bool = game["phase"] == "finished"
	turn_label.text = "VENCEDOR: %s" % Rules.LABELS[color].to_upper() if winner else "VEZ: %s" % Rules.LABELS[color].to_upper()
	turn_label.add_theme_color_override("font_color",BoardScript.PALETTE[color])
	status_label.text = game["message"]
	for child in players_bar.get_children():
		players_bar.remove_child(child)
		child.queue_free()
	for player in game["seats"]:
		var finished_count := 0
		for p in game["pieces"][player]:
			if p == Rules.HOME:
				finished_count += 1
		var badge := PanelContainer.new()
		badge.add_theme_stylebox_override("panel",UI.style(Color("273651") if color == player else UI.PANEL))
		badge.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		badge.add_child(UI.label("%s %d/4" % [Rules.LABELS[player].substr(0,3).to_upper(),finished_count],20,BoardScript.PALETTE[player]))
		players_bar.add_child(badge)
	board.state = game
	board.selectable = Rules.legal_moves(game) if game["phase"] == "choose" and not animating else []
	board.animations_enabled = not reduced_motion
	board.queue_redraw()
	dice_button.disabled = game["phase"] != "roll" or animating or pause_dialog.visible or game["cpu"].has(color)
	if winner:
		dice_button.text = "PARTIDA FINALIZADA"
	elif game["phase"] == "choose":
		dice_button.text = "DADO %d: TOQUE NO PEÃO" % game["die"]
	elif game["bank_sixes"] and not game["bank"].is_empty():
		dice_button.text = "6! LANÇAR NOVAMENTE"
	else:
		dice_button.text = "LANÇAR DADO" if game["die"] == 0 else "DADO %d: LANÇAR" % game["die"]

func _on_roll() -> void:
	if in_menu or animating or pause_dialog.visible or game.is_empty() or game["cpu"].has(game["current"]):
		return
	_roll()

func _roll() -> void:
	if game.is_empty() or game["phase"] != "roll" or in_menu or pause_dialog.visible:
		return
	var result: Dictionary = Rules.roll(game,rng.randi_range(1,6))
	if not result["ok"]:
		return
	_save()
	_refresh()
	_schedule_cpu()

func _on_piece(token: int) -> void:
	if in_menu or animating or pause_dialog.visible or game["cpu"].has(game["current"]):
		return
	_move(token)

func _move(token: int) -> void:
	if game["phase"] != "choose" or not Rules.legal_moves(game).has(token):
		return
	var color: int = game["current"]
	var from: int = game["pieces"][color][token]
	var result: Dictionary = Rules.move(game,token)
	if not result["ok"]:
		return
	_save()
	if reduced_motion:
		_refresh()
		_schedule_cpu()
		return
	animating = true
	board.animated_color = color
	board.animated_token = token
	board.animated_position = board.token_point(color,token,from)
	_refresh()
	var tween := create_tween()
	if from == Rules.OUT:
		tween.tween_property(board,"animated_position",board.token_point(color,token,0),0.13).set_trans(Tween.TRANS_SINE)
	else:
		for progress in range(from+1,int(result["to"])+1):
			tween.tween_property(board,"animated_position",board.token_point(color,token,progress),0.075).set_trans(Tween.TRANS_SINE)
	tween.tween_callback(_end_move)

func _end_move() -> void:
	animating = false
	board.animated_color = -1
	board.animated_token = -1
	_refresh()
	_schedule_cpu()

func _schedule_cpu() -> void:
	if in_menu or animating or cpu_scheduled or game.is_empty() or pause_dialog.visible or game["phase"] == "finished":
		return
	if not game["cpu"].has(game["current"]):
		return
	cpu_scheduled = true
	get_tree().create_timer(0.5 if not reduced_motion else 0.1).timeout.connect(_cpu_tick)

func _cpu_tick() -> void:
	cpu_scheduled = false
	if game.is_empty() or in_menu or animating or pause_dialog.visible or not game["cpu"].has(game["current"]):
		return
	if game["phase"] == "roll":
		_roll()
	elif game["phase"] == "choose":
		var token: int = Rules.best_cpu_move(game)
		if token >= 0:
			_move(token)