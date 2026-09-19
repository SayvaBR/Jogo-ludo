class_name LudoMenu
extends ScrollContainer

signal start_requested(players: int, cpu: bool)
signal resume_requested
signal motion_changed(reduced: bool)
const UI = preload("res://scripts/ui_factory.gd")
const SAVE := "user://ludo_save.json"
var bank_enabled := false
var reduced_motion := false
var resume_button: Button
var rule_button: Button

func _ready() -> void:
	horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var layout := VBoxContainer.new()
	layout.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	layout.add_theme_constant_override("separation",12)
	add_child(layout)
	var logo := UI.label("LUDO",76)
	logo.custom_minimum_size.y = 110
	layout.add_child(logo)
	var subtitle := UI.label("Uma corrida de quatro peões.\nUm dado. Muitas viradas.",25,UI.MUTED)
	subtitle.custom_minimum_size.y = 82
	layout.add_child(subtitle)
	resume_button = UI.button("CONTINUAR PARTIDA",Color("36b990"))
	resume_button.pressed.connect(func(): resume_requested.emit())
	layout.add_child(resume_button)
	layout.add_child(UI.label("ESCOLHA UMA PARTIDA",24))
	for count in [2,3,4]:
		var button := UI.button("%d JOGADORES LOCAIS" % count)
		button.pressed.connect(Callable(self,"_start").bind(count,false))
		layout.add_child(button)
	for count in [2,4]:
		var button := UI.button("1 CONTRA %d CPU" % (count-1),Color("287e9d"))
		button.pressed.connect(Callable(self,"_start").bind(count,true))
		layout.add_child(button)
	rule_button = UI.button("REGRA: CLÁSSICA",UI.PANEL,67)
	rule_button.pressed.connect(func(): set_bank_rule(not bank_enabled))
	layout.add_child(rule_button)
	var help := UI.button("COMO JOGAR",UI.PANEL,67)
	help.pressed.connect(_help)
	layout.add_child(help)
	var motion := UI.button("ANIMAÇÕES: LIGADAS",UI.PANEL,67)
	motion.pressed.connect(func():
		reduced_motion = not reduced_motion
		motion.text = "ANIMAÇÕES: REDUZIDAS" if reduced_motion else "ANIMAÇÕES: LIGADAS"
		motion_changed.emit(reduced_motion)
	)
	layout.add_child(motion)
	refresh()

func _start(count: int, cpu: bool) -> void:
	start_requested.emit(count,cpu)

func set_bank_rule(value: bool) -> void:
	bank_enabled = value
	rule_button.text = "REGRA: ACUMULAR 6" if value else "REGRA: CLÁSSICA"

func refresh() -> void:
	if resume_button != null:
		resume_button.visible = FileAccess.file_exists(SAVE)

func _help() -> void:
	var d := AcceptDialog.new()
	d.title = "Como jogar"
	d.dialog_text = "Cada participante tem 4 peões. Tire 6 para sair da base e jogar novamente. Três 6 consecutivos encerram a vez. Toque no peão iluminado para avançar. Saídas e estrelas são casas seguras. Fora delas, cair sobre rivais envia seus peões à base. A reta de cada cor é protegida. Chegue ao centro com valor exato. Quatro peões concluídos vencem. Na variante ACUMULAR 6, role antes de mover e use os dados em ordem. Não há dados extras por captura ou chegada."
	add_child(d)
	d.confirmed.connect(d.queue_free)
	d.canceled.connect(d.queue_free)
	d.popup_centered_ratio(0.86)