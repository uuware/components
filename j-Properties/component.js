COMPONENT('properties', 'datetimeformat:yyyy-MM-dd HH:mm;dateformat:yyyy-MM-dd;timeformat:HH:mm;offset:0;margin:0', function(self, config) {

	var cls = 'ui-' + self.name;
	var cls2 = '.' + cls;
	var container;
	var scroller;
	var types = {};
	var prevh = -1;
	var skip = false;
	var prefkey = 'jcproperties';

	self.make = function() {

		self.aclass(cls);

		if (!$('#propertiesupload').length)
			$(document.body).append('<input type="file" id="propertiesupload" />');

		self.append('<div class="{0}-scroller"><div class="{0}-container"></div></div>'.format(cls, config.search));
		container = self.find(cls2 + '-container');
		scroller = self.find(cls2 + '-scroller');
		self.scrollbar = SCROLLBAR(scroller);

		self.event('click', 'label', function() {
			var el = $(this).closest(cls2 + '-group');
			el.tclass(cls + '-hidden');

			var is = el.hclass(cls + '-hidden');
			var id = el.attrd('id');

			var prop = PREF.get(prefkey);
			if (prop) {
				if (is)
					prop[id] = 1;
				else
					delete prop[id];
			} else if (is) {
				prop = {};
				prop[id] = 1;
			}

			PREF.set(prefkey, prop, '1 month');
		});

		self.on('resize', self.resize2);
		$(W).on('resize', self.resize2);
		self.resize();
		self.scrollbar.resize();

		var keys = Object.keys(types);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			types[key].init && types[key].init();
		}
	};

	self.finditem = function(el) {
		var index = +$(el).closest(cls2 + '-item').attrd('index');
		return index >= 0 ? self.get()[index] : null;
	};

	self.findel = function(el) {
		return $(el).closest(cls2 + '-item');
	};

	self.register = function(name, init, render) {
		types[name] = {};
		types[name].init = init;
		types[name].render = render;
		init(self);
	};

	types.string = {};
	types.string.init = function() {
		self.event('change', '.pstring', function() {
			var t = this;
			var item = self.finditem(t);
			var val = t.value.trim();

			switch (item.transform) {
				case 'uppercase':
					val = val.toUpperCase();
					t.value = val;
					break;
				case 'lowercase':
					val = val.toLowerCase();
					t.value = val;
					break;
				case 'capitalize':
					var tmp = val.split(' ');
					for (var i = 0; i < tmp.length; i++)
						tmp[i] = tmp[i].substring(0, 1).toUpperCase() + tmp[i].substring(1);
					t.value = tmp.join(' ');
					break;
				case 'slug':
					val = val.slug();
					break;
			}

			var isvalid = item.required == true ? !!val : true;
			if (isvalid) {

				// Is RegExp?
				if (typeof(item.validate) === 'object') {
					isvalid = item.validate.test(val);
				} else {
					switch (item.validate) {
						case 'email':
							isvalid = val.isEmail();
							break;
						case 'phone':
							isvalid = val.isPhone();
							break;
						case 'url':
							isvalid = val.isURL();
							break;
					}
				}
			}

			var el = self.findel(t);

			if (isvalid) {
				item.value = val;
				item.changed = item.prev !== val;
				el.tclass(cls + '-changed', item.changed);
				config.change && EXEC(config.change, item);
				self.change(true);
			}

			item.invalid = !isvalid;
			el.tclass(cls + '-invalid', item.invalid);
			t.$processed = true;
		});
	};
	types.string.render = function(item, next) {
		next('<div class="{0}-string"><input type="text" maxlength="{1}" placeholder="{2}" value="{3}" class="pstring" /></div>'.format(cls, item.maxlength || 100, item.placeholder || '', Thelpers.encode(item.value)));
	};

	types.number = {};
	types.number.init = function() {

		self.event('blur change', '.pnumber', function() {
			var t = this;

			if (t.$processed)
				return;

			var el = self.findel(t);
			var item = self.finditem(t);
			var val = t.value.parseFloat();

			var isvalid = true;

			if (item.min != null && val < item.min)
				isvalid = false;
			else if (item.max != null && val > item.max)
				isvalid = false;

			item.invalid = !isvalid;

			if (isvalid) {
				item.value = val;
				item.changed = item.prev !== val;
				el.tclass(cls + '-changed', item.changed);
				config.change && EXEC(config.change, item);
				self.change(true);
			}

			el.tclass(cls + '-invalid', item.invalid);
			t.$processed = true;
		});

		self.event('keydown', '.pnumber', function(e) {
			var t = this;

			t.$processed = false;

			if (e.which === 38 || e.which === 40) {
				var num = t.value.parseFloat();
				var item = self.finditem(t);
				if (e.which === 38)
					num += item.inc || 1;
				else if (e.which === 40)
					num -= item.inc || 1;
				t.value = num;
				e.preventDefault();
			}

		});
	};
	types.number.render = function(item, next) {
		next('<div class="{0}-number"><input type="text" maxlength="{1}" placeholder="{2}" value="{3}" class="pnumber" /></div>'.format(cls, 20, item.placeholder || '', Thelpers.encode(item.value + '')));
	};

	types.date = {};
	types.date.init = function() {

		self.event('blur change', '.pdate', function(e) {

			var t = this;

			if (e.type === 'change')
				SETTER('!datepicker', 'hide');

			if (t.$processed)
				return;

			var item = self.finditem(t);
			var val = t.value.parseDate(config.dateformat);
			item.value = val;
			item.changed = !item.prev || item.prev.format(config.dateformat) !== val.format(config.dateformat);
			self.findel(t).tclass(cls + '-changed', item.changed);
			config.change && EXEC(config.change, item, function(val) {
				t.value = val;
			});
			self.change(true);
			t.$processed = true;
		});

		self.event('keydown', '.pdate', function(e) {
			var t = this;
			t.$processed = false;
			if ((e.which === 38 || e.which === 40) && t.value) {
				var val = t.value.parseDate(config.dateformat);
				var item = self.finditem(t);
				val = val.add((e.which === 40 ? '-' : '') + (item.inc || '1 day'));
				t.value = val.format(config.dateformat);
				e.preventDefault();
			}
		});

		self.event('click', '.pdate', function() {
			var t = this;
			var el = $(t);
			var opt = {};
			var item = self.finditem(t);
			opt.element = el;
			opt.value = item.value;
			opt.callback = function(value) {
				t.$processed = false;
				t.value = value.format(config.dateformat);
				el.trigger('change');
			};
			SETTER('datepicker', 'show', opt);
		});
	};
	types.date.render = function(item, next) {
		next('<div class="{0}-date"><input type="text" maxlength="{1}" placeholder="{2}" value="{3}" class="pdate" /></div>'.format(cls, config.dateformat.length, item.placeholder || '', item.value ? item.value.format(config.dateformat) : ''));
	};

	types.bool = {};
	types.bool.init = function() {
		self.event('click', cls2 + '-booltoggle', function() {
			var t = this;
			var el = $(t);
			el.tclass('checked');
			var item = self.finditem(t);
			item.value = el.hclass('checked');
			item.changed = item.prev !== item.value;
			self.findel(t).tclass(cls + '-changed', item.changed);
			config.change && EXEC(config.change, item);
			self.change(true);
		});
	};
	types.bool.render = function(item, next) {
		next('<div class="{0}-bool"><span class="{0}-booltoggle{1}"><i class="fa fa-check"></i></span></div>'.format(cls, item.value ? ' checked' : ''));
	};

	types.list = {};
	types.list.init = function() {
		self.event('click', cls2 + '-list', function() {
			var t = this;
			var item = self.finditem(t);
			var opt = {};
			opt.offsetY = -5;
			opt.offsetX = 6;
			opt.element = $(t);
			opt.items = typeof(item.items) === 'string' ? item.items.indexOf('/') === -1 ? GET(item.items) : item.items : item.items;
			opt.custom = item.dircustom;
			if (item.dirsearch)
				opt.placeholder = item.dirsearch;
			else if (item.dirsearch == false)
				opt.search = false;
			opt.callback = function(value) {
				if (typeof(value) === 'string') {
					opt.element.find('span').text(value);
					item.value = value;
				} else {
					opt.element.find('span').html(value[item.dirkey || 'name']);
					item.value = value[item.dirvalue || 'id'];
				}
				item.changed = item.prev !== item.value;
				self.findel(t).tclass(cls + '-changed', item.changed);
				config.change && EXEC(config.change, item, function(val) {
					opt.element.find('span').text(val);
				});
				self.change(true);
			};
			SETTER('directory', 'show', opt);
		});
	};

	types.list.render = function(item, next) {
		var template = '<div class="{0}-list"><i class="fa fa-caret-down"></i><span>{1}</span></div>';
		if (item.detail) {
			AJAX('GET ' + item.detail.format(item.value), function(response) {
				next(template.format(cls, response[item.dirkey || 'name'] || item.placeholder || DEF.empty));
			});
		} else {
			var arr = typeof(item.items) === 'string' ? GET(item.items) : item.items;
			var m = (arr || EMPTYARRAY).findValue(item.dirvalue || 'id', item.value, item.dirkey || 'name', item.placeholder || DEF.empty);
			next(template.format(cls, m));
		}
	};

	types.color = {};
	types.color.init = function() {
		self.event('click', cls2 + '-colortoggle', function() {
			var t = this;
			var item = self.finditem(t);
			var opt = {};
			// opt.offsetY = -5;
			// opt.offsetX = 6;
			opt.align = 'center';
			opt.element = $(t);
			opt.callback = function(value) {
				opt.element.find('b').css('background-color', value);
				item.value = value;
				item.changed = item.prev !== item.value;
				self.findel(t).tclass(cls + '-changed', item.changed);
				config.change && EXEC(config.change, item, function(val) {
					opt.element.find('b').css('background-color', val);
				});
				self.change(true);
			};
			SETTER('colorpicker', 'show', opt);
		});
	};
	types.color.render = function(item, next) {
		next('<div class="{0}-color"><span class="{0}-colortoggle"><b{1}>&nbsp;</b></span></div>'.format(cls, item.value ? (' style="background-color:' + item.value + '"') : ''));
	};

	types.fontawesome = {};
	types.fontawesome.init = function() {
		self.event('click', cls2 + '-fontawesometoggle', function() {
			var t = this;
			var item = self.finditem(t);
			var opt = {};
			opt.align = 'center';
			opt.element = $(t);
			opt.callback = function(value) {
				opt.element.find('i').rclass().aclass(value);
				item.value = value;
				item.changed = item.prev !== item.value;
				self.findel(t).tclass(cls + '-changed', item.changed);
				config.change && EXEC(config.change, item, function(val) {
					opt.element.find('i').rclass().aclass(val);
				});
				self.change(true);
			};
			SETTER('faicons', 'show', opt);
		});
	};
	types.fontawesome.render = function(item, next) {
		next('<div class="{0}-fontawesome"><span class="{0}-fontawesometoggle"><i class="{1}"></i></span></div>'.format(cls, item.value || ''));
	};

	types.emoji = {};
	types.emoji.init = function() {
		self.event('click', cls2 + '-emojitoggle', function() {
			var t = this;
			var item = self.finditem(t);
			var opt = {};
			opt.align = 'center';
			opt.element = $(t);
			opt.callback = function(value) {
				opt.element.html(value);
				item.value = value;
				item.changed = item.prev !== item.value;
				self.findel(t).tclass(cls + '-changed', item.changed);
				config.change && EXEC(config.change, item, function(val) {
					opt.element.html(val);
				});
				self.change(true);
			};
			SETTER('emoji', 'show', opt);
		});
	};
	types.emoji.render = function(item, next) {
		next('<div class="{0}-emoji"><span class="{0}-emojitoggle">{1}</span></div>'.format(cls, item.value || DEF.empty));
	};

	types.file = {};
	types.file.init = function() {
		self.event('click', cls2 + '-file', function() {
			// Loads file
			var t = this;
			var item = self.finditem(t);
			var file = $('#propertiesupload');

			if (item.accept)
				file.attr('accept', item.accept);
			else
				file.removeAttr('accept');

			file.off('change').on('change', function() {
				var file = this;
				var data = new FormData();
				data.append('file', file.files[0]);
				SETTER('loading', 'show');
				UPLOAD(item.url, data, function(response) {
					item.value = response;
					item.changed = item.prev !== item.value;
					self.findel(t).tclass(cls + '-changed', item.changed);
					config.change && EXEC(config.change, item, function(val) {
						self.findel(cls2 + '-filename').text(val);
					});
					SETTER('loading', 'hide', 1000);
					file.value = '';
					self.change(true);
				});
			}).trigger('click');
		});
	};

	types.file.render = function(item, next) {
		next('<div class="{0}-file"><i class="far fa-folder"></i><span class="{0}-filename">{1}</span></div>'.format(cls, item.filename || item.value || DEF.empty));
	};

	self.readonly();
	self.nocompile();
	self.bindvisible();

	self.resize = function() {
		var h = 0;

		if (config.height > 0)
			h = config.height;
		else if (config.parent)
			h = (config.parent === 'window' ? WH : config.parent === 'parent' ? self.parent().height() : self.closest(config.parent).height()) - config.offset;

		h -= config.margin;

		if (prevh === h)
			return;

		prevh = h;

		scroller.css('height', h);
		self.scrollbar.resize();
	};

	self.resize2 = function() {
		setTimeout2(self.ID, self.resize, 500);
	};

	self.destroy = function() {
		$(W).off('resize', self.resize2);
	};

	self.render = function(item, index) {
		var type = types[item.type === 'boolean' ? 'bool' : item.type];
		var el = $('<div class="{0}-item" data-index="{1}"><div class="{0}-key">{{ label }}</div><div class="{0}-value">&nbsp;</div></div>'.format(cls, index).arg(item));
		type.render(item, function(html) {
			el.find(cls2 + '-value').html(html);
		});
		return el;
	};

	self.setter = function(value) {

		if (skip) {
			skip = false;
			return;
		}

		container.empty();
		var groups = {};
		for (var i = 0; i < value.length; i++) {
			var item = value[i];
			var g = item.group || 'Default';

			item.invalid = false;

			if (!groups[g])
				groups[g] = { html: [] };

			switch (item.type) {
				case 'fontawesome':
				case 'string':
					item.prev = item.value || '';
					break;
				case 'date':
					item.prev = item.value ? item.value.format(config.dateformat) : null;
					break;
				case 'number':
				case 'bool':
				case 'boolean':
				case 'list':
					item.prev = item.value;
					break;
			}

			groups[g].html.push(self.render(item, i));
		}

		var keys = Object.keys(groups);
		var def = PREF.get(prefkey) || EMPTYOBJECT;
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var group = groups[key];
			var hash = 'g' + HASH(key, true);
			var el = $('<div class="{0}-group{3}" data-id="{2}"><label><i class="far"></i>{1}</label><section></section></div>'.format(cls, key, hash, def[hash] ? (' ' + cls + '-hidden') : ''));
			var section = el.find('section');
			for (var j = 0; j < group.html.length; j++)
				section.append(group.html[j]);
			container.append(el);
		}

		self.resize();
	};

});