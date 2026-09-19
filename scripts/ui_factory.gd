class_name LudoUI
extends RefCounted
const PANEL := Color("182440")
const ACCENT := Color("6968fb")
const MUTED := Color("acbad7")

static func style(color: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = color
	s.border_color = color.darkened(0.3)
	s.border_width_bottom = 6
	s.set_corner_radius_all(21)
	s.content_margin_left = 12
	s.content_margin_right = 12
	s.content_margin_top = 9
	s.content_margin_bottom = 10
	return s

static func button(text: String, color: Color = ACCENT, height: int = 72) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0,height)
	b.add_theme_font_size_override("font_size",25)
	for key in ["font_color","font_hover_color","font_pressed_color"]:
		b.add_theme_color_override(key,Color.WHITE)
	b.add_theme_stylebox_override("normal",style(color))
	b.add_theme_stylebox_override("hover",style(color.lightened(0.1)))
	b.add_theme_stylebox_override("pressed",style(color.darkened(0.1)))
	b.add_theme_stylebox_override("disabled",style(Color("303b56")))
	b.focus_mode = Control.FOCUS_NONE
	return b

static func label(text: String, font_size: int = 26, color: Color = Color.WHITE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_color_override("font_color",color)
	l.add_theme_font_size_override("font_size",font_size)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l