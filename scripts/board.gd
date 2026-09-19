class_name LudoBoard
extends Control

signal token_pressed(token: int)
const Rules = preload("res://scripts/rules.gd")
const Data = preload("res://scripts/board_data.gd")
const PALETTE := [Color("ff526c"), Color("369dfc"), Color("ffcf51"), Color("40ce9e")]
const LINE := Color("d0d8e8")
var state: Dictionary = {}
var selectable: Array = []
var animated_color := -1
var animated_token := -1
var animated_position := Vector2.ZERO
var animations_enabled := true
var clock := 0.0

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP

func _process(delta: float) -> void:
	clock += delta
	if animated_color >= 0 or not selectable.is_empty():
		queue_redraw()

func _cell() -> float:
	return (minf(size.x, size.y) - 8.0) / 15.0

func _origin() -> Vector2:
	return (size - Vector2.ONE * _cell() * 15.0) * 0.5

func _center(cell: Vector2i) -> Vector2:
	return _origin() + (Vector2(cell) + Vector2(0.5,0.5)) * _cell()

func token_point(color: int, token: int, progress: int) -> Vector2:
	if progress == Rules.OUT:
		return _center(Data.YARD[color][token])
	if progress == Rules.HOME:
		return _center(Vector2i(7,7)) + [Vector2(-8,-8),Vector2(-8,8),Vector2(8,8),Vector2(8,-8)][color]
	if progress < Rules.TRACK:
		return _center(Data.TRACK_CELLS[Rules.global_square(color,progress)])
	return _center(Data.HOME_CELLS[color][progress - Rules.TRACK])

func _paint_cell(cell: Vector2i, paint: Color) -> void:
	var r := Rect2(_origin() + Vector2(cell) * _cell(), Vector2.ONE * _cell()).grow(-0.6)
	draw_rect(r, paint)
	draw_rect(r, LINE, false, 1.25)

func _draw() -> void:
	var c := _cell()
	draw_rect(Rect2(_origin(), Vector2.ONE * c * 15.0).grow(3), Color("111b32"))
	for color in range(4):
		var corner: Vector2i = [Vector2i(0,0),Vector2i(0,9),Vector2i(9,9),Vector2i(9,0)][color]
		var bounds := Rect2(_origin() + Vector2(corner) * c, Vector2.ONE * c * 6.0)
		draw_rect(bounds, PALETTE[color])
		draw_rect(bounds.grow(-c*0.6), Color.WHITE)
		for pad in Data.YARD[color]:
			draw_circle(_center(pad), c*0.37, PALETTE[color])
			draw_circle(_center(pad), c*0.28, Color.WHITE)
	for idx in range(52):
		var cell: Vector2i = Data.TRACK_CELLS[idx]
		var color := Color.WHITE
		if Rules.STARTS.has(idx):
			color = PALETTE[Rules.STARTS.find(idx)].lightened(0.45)
		elif Rules.SAFE.has(idx):
			color = Color("dce7ff")
		_paint_cell(cell, color)
		if Rules.SAFE.has(idx):
			draw_circle(_center(cell), c*0.13, Color("7486ab"))
	for i in range(4):
		for lane in Data.HOME_CELLS[i]:
			_paint_cell(lane, PALETTE[i].lightened(0.27))
	var origin := _origin() + Vector2(6,6)*c
	var middle := origin + Vector2.ONE*1.5*c
	var corners := [origin,origin+Vector2(0,3*c),origin+Vector2(3*c,3*c),origin+Vector2(3*c,0)]
	for i in range(4):
		draw_colored_polygon(PackedVector2Array([corners[i],corners[(i+1)%4],middle]),PALETTE[i])
	if state.is_empty():
		return
	for player in state["seats"]:
		for token in range(4):
			if player == animated_color and token == animated_token:
				continue
			var progress: int = state["pieces"][player][token]
			var pos := token_point(player,token,progress)
			if progress >= 0 and progress < Rules.HOME:
				var group: Array = []
				for other in state["seats"]:
					for t in range(4):
						var p: int = state["pieces"][other][t]
						if p >= 0 and p < Rules.TRACK and progress < Rules.TRACK and Rules.global_square(other,p) == Rules.global_square(player,progress):
							group.append(Vector2i(other,t))
						elif p >= Rules.TRACK and p < Rules.HOME and other == player and p == progress:
							group.append(Vector2i(other,t))
				if group.size() > 1:
					var a: float = TAU*float(group.find(Vector2i(player,token)))/float(group.size())
					pos += Vector2(cos(a),sin(a))*c*0.17
			_draw_token(pos,player,c*0.29,state["current"]==player and selectable.has(token))
	if animated_color >= 0:
		_draw_token(animated_position,animated_color,c*0.30,false)

func _draw_token(pos: Vector2, color: int, radius: float, highlighted: bool) -> void:
	if highlighted:
		draw_circle(pos,radius*(1.5+0.12*sin(clock*5.0) if animations_enabled else 1.5),PALETTE[color].lightened(0.4))
	draw_circle(pos+Vector2(0,radius*0.16),radius*1.14,Color("1a2540"))
	draw_circle(pos,radius,PALETTE[color])
	draw_arc(pos,radius*0.8,-PI*0.92,-PI*0.08,18,Color.WHITE,maxf(1.2,radius*0.12),true)

func _gui_input(event: InputEvent) -> void:
	if state.is_empty() or state["phase"] != "choose":
		return
	var position := Vector2.ZERO
	if event is InputEventScreenTouch:
		if not event.pressed: return
		position = (event as InputEventScreenTouch).position
	elif event is InputEventMouseButton:
		if not event.pressed or event.button_index != MOUSE_BUTTON_LEFT: return
		position = (event as InputEventMouseButton).position
	else:
		return
	var closest := -1
	var distance := INF
	for token in selectable:
		var p := token_point(state["current"],token,state["pieces"][state["current"]][token])
		var d := position.distance_to(p)
		if d < distance and d < _cell()*0.85:
			distance = d
			closest = token
	if closest >= 0:
		accept_event()
		token_pressed.emit(closest)