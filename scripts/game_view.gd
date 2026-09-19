class_name LudoView
extends Control

const Rules = preload("res://scripts/rules.gd")
const UI = preload("res://scripts/ui_factory.gd")
const BoardScript = preload("res://scripts/board.gd")
const MenuScript = preload("res://scripts/menu.gd")
const SAVE := "user://ludo_save.json"
var game: Dictionary = {}
var in_menu := true
var animating := false
var cpu_scheduled := false
var reduced_motion := false
var rng := RandomNumberGenerator.new()
var menu_screen: LudoMenu
var match_screen: VBoxContainer
var turn_label: Label
var status_label: Label
var dice_button: Button
var players_bar: HBoxContainer
var board: LudoBoard
var pause_dialog: ConfirmationDialog

func _ready() -> void:
	rng.randomize()
	var bg := ColorRect.new()
	bg.color = Color("0c1022")
	add_child(bg)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var margins := MarginContainer.new()
	add_child(margins)
	margins.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margins.add_theme_constant_override("margin_left",20)
	margins.add_theme_constant_override("margin_right",20)
	margins.add_theme_constant_override("margin_top",22)
	margins.add_theme_constant_override("margin_bottom",24)
	menu_screen = MenuScript.new()
	margins.add_child(menu_screen)
	menu_screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	menu_screen.start_requested.connect(Callable(self,"_start_game"))
	menu_screen.resume_requested.connect(Callable(self,"_resume"))
	menu_screen.motion_changed.connect(func(value: bool): reduced_motion = value)
	match_screen = VBoxContainer.new()
	match_screen.add_theme_constant_override("separation",14)
	margins.add_child(match_screen)
	match_screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var header := HBoxContainer.new()
	match_screen.add_child(header)
	var title := UI.label("LUDO",48)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	header.add_child(title)
	var pause := UI.button("MENU",UI.PANEL,65)
	pause.custom_minimum_size.x = 130
	pause.pressed.connect(_open_pause)
	header.add_child(pause)
	turn_label = UI.label("",27)
	turn_label.custom_minimum_size.y = 45
	match_screen.add_child(turn_label)
	players_bar = HBoxContainer.new()
	players_bar.add_theme_constant_override("separation",8)
	players_bar.custom_minimum_size.y = 60
	match_screen.add_child(players_bar)
	var aspect := AspectRatioContainer.new()
	aspect.ratio = 1.0
	aspect.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	aspect.size_flags_vertical = Control.SIZE_EXPAND_FILL
	match_screen.add_child(aspect)
	board = BoardScript.new()
	board.custom_minimum_size = Vector2(320,320)
	board.token_pressed.connect(Callable(self,"_on_piece"))
	aspect.add_child(board)
	status_label = UI.label("",23,UI.MUTED)
	status_label.custom_minimum_size.y = 76
	match_screen.add_child(status_label)
	dice_button = UI.button("LANÇAR DADO",UI.ACCENT,111)
	dice_button.pressed.connect(Callable(self,"_on_roll"))
	match_screen.add_child(dice_button)
	pause_dialog = ConfirmationDialog.new()
	pause_dialog.title = "Pausar partida"
	pause_dialog.dialog_text = "Voltar ao menu principal? A partida está salva."
	pause_dialog.ok_button_text = "IR AO MENU"
	pause_dialog.confirmed.connect(_show_menu)
	add_child(pause_dialog)
	_show_menu()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if pause_dialog != null and pause_dialog.visible:
			pause_dialog.hide()
		elif not in_menu:
			_open_pause()
		get_viewport().set_input_as_handled()

func _open_pause() -> void:
	if not in_menu and not animating:
		pause_dialog.popup_centered()

func _show_menu() -> void:
	in_menu = true
	menu_screen.visible = true
	match_screen.visible = false
	menu_screen.refresh()

func _show_match() -> void:
	in_menu = false
	menu_screen.visible = false
	match_screen.visible = true
	call("_refresh")
	call("_schedule_cpu")