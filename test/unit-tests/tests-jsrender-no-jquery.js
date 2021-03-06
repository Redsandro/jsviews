/// <reference path="../qunit/qunit.js" />
/// <reference path="../../jsrender.js" />
(function(global, $, undefined) {
"use strict";
(function() {

function compileTmpl(template) {
	try {
		return typeof $.templates(template).fn === "function" ? "compiled" : "failed compile";
	}
	catch(e) {
		return e.message;
	}
}

function sort(array) {
	var ret = "";
	if (this.tagCtx.props.reverse) {
		// Render in reverse order
		if (arguments.length > 1) {
			for (i = arguments.length; i; i--) {
				ret += sort.call(this, arguments[ i - 1 ]);
			}
		} else {
			for (var i = array.length; i; i--) {
				ret += this.tagCtx.render(array[ i - 1 ]);
			}
		}
	} else {
		// Render in original order
		ret += this.tmpl.render(array);
	}
	return ret;
}

var person = { name: "Jo" },
	people = [{ name: "Jo" },{ name: "Bill" }],
	towns = [{ name: "Seattle" },{ name: "Paris" },{ name: "Delhi" }];

var tmplString = "A_{{:name}}_B";
$.views.tags({ sort: sort });

module("tagParser");
test("{{if}} {{else}}", 4, function() {
	equal(compileTmpl("A_{{if true}}{{/if}}_B"), "compiled", "Empty if block: {{if}}{{/if}}");
	equal(compileTmpl("A_{{if true}}yes{{/if}}_B"), "compiled", "{{if}}...{{/if}}");
	equal(compileTmpl("A_{{if true/}}yes{{/if}}_B"), "Syntax error\nUnmatched or missing tag: \"{{/if}}\" in template:\nA_{{if true/}}yes{{/if}}_B", "unmatched or missing tag error");
	equal($.templates("<span id='x'></span> a'b\"c\\").render(), "<span id=\'x\'></span> a\'b\"c\\", "Correct escaping of quotes and backslash");
});

module("{{if}}");
test("{{if}}", 4, function() {
	equal($.templates("A_{{if true}}yes{{/if}}_B").render(), "A_yes_B", "{{if a}}: a");
	equal($.templates("A_{{if false}}yes{{/if}}_B").render(), "A__B", "{{if a}}: !a");
	equal($.templates("A_{{if true}}{{/if}}_B").render(), "A__B", "{{if a}}: empty: a");
	equal($.templates("A_{{if false}}{{/if}}_B").render(), "A__B", "{{if a}}: empty: !a");
});

test("{{if}} {{else}}", 9, function() {
	equal($.templates("A_{{if true}}yes{{else}}no{{/if}}_B").render(), "A_yes_B", "{{if a}} {{else}}: a");
	equal($.templates("A_{{if false}}yes{{else}}no{{/if}}_B").render(), "A_no_B", "{{if a}} {{else}}: !a");
	equal($.templates("A_{{if true}}yes{{else true}}or{{else}}no{{/if}}_B").render(), "A_yes_B", "{{if a}} {{else b}} {{else}}: a");
	equal($.templates("A_{{if false}}yes{{else true}}or{{else}}no{{/if}}_B").render(), "A_or_B", "{{if a}} {{else b}} {{else}}: b");
	equal($.templates("A_{{if false}}yes{{else false}}or{{else}}no{{/if}}_B").render(), "A_no_B", "{{if a}} {{else b}} {{else}}: !a!b");
	equal($.templates("A_{{if undefined}}yes{{else true}}or{{else}}no{{/if}}_B").render({}), "A_or_B", "{{if undefined}} {{else b}} {{else}}: !a!b");
	equal($.templates("A_{{if false}}yes{{else undefined}}or{{else}}no{{/if}}_B").render({}), "A_no_B", "{{if a}} {{else undefined}} {{else}}: !a!b");
	equal($.templates("A_{{if false}}<div title='yes'{{else}}<div title='no'{{/if}}>x</div>_B").render(), "A_<div title='no'>x</div>_B", "{{if}} and {{else}} work across HTML tags");
	equal($.templates("A_<div title='{{if true}}yes'{{else}}no'{{/if}}>x</div>_B").render(), "A_<div title='yes'>x</div>_B", "{{if}} and {{else}} work across quoted strings");
});

test("{{if}} {{else}} external templates", 2, function() {
	equal($.templates("A_{{if true tmpl='yes<br/>'/}}_B").render(), "A_yes<br/>_B", "{{if a tmpl=foo/}}: a");
	equal($.templates("A_{{if false tmpl='yes<br/>'}}{{else false tmpl='or<br/>'}}{{else tmpl='no<br/>'}}{{/if}}_B").render(), "A_no<br/>_B", "{{if a tmpl=foo}}{{else b tmpl=bar}}{{else tmpl=baz}}: !a!b");
});

module("{{:}}");
test("convert", 4, function() {
	equal($.templates("{{>#data}}").render("<br/>'\"&"), "&lt;br/&gt;&#39;&#34;&amp;", "default html converter");
	equal($.templates("{{html:#data}}").render("<br/>'\"&"), "&lt;br/&gt;&#39;&#34;&amp;", "html converter");
	equal($.templates("{{:#data}}").render("<br/>'\"&"), "<br/>'\"&", "no convert");

	function loc(data) {
		switch (data) { case "desktop": return "bureau"; }
	}
	$.views.converters("loc", loc);
	equal($.templates("{{loc:#data}}:{{loc:'desktop'}}").render("desktop"), "bureau:bureau", '$.views.converters("loc", locFunction);... {{loc:#data}}');
});

test("paths", 17, function() {
	equal($.templates("{{:a}}").render({ a: "aVal" }), "aVal", "a");
	equal($.templates("{{:a.b}}").render({ a: { b: "bVal" }}), "bVal", "a.b");
	equal($.templates("{{:a.b.c}}").render({ a: { b: { c: "cVal" }}}), "cVal", "a.b.c");
	equal($.templates("{{:a.name}}").render({ a: { name: "aName" }}), "aName", "a.name");
	equal($.templates("{{:a['name']}}").render({ a: { name: "aName"} }), "aName", "a['name']");
	equal($.templates("{{:a['x - _*!']}}").render({ a: { "x - _*!": "aName"} }), "aName", "a['x - _*!']");
	equal($.templates("{{:#data['x - _*!']}}").render({ "x - _*!": "aName"}), "aName", "#data['x - _*!']");
	equal($.templates('{{:a["x - _*!"]}}').render({ a: { "x - _*!": "aName"} }), "aName", 'a["x - _*!"]');
	equal($.templates("{{:a.b[1].d}}").render({ a: { b: [0, { d: "dVal"}]} }), "dVal", "a.b[1].d");
	equal($.templates("{{:a.b[1].d}}").render({ a: { b: {1:{ d: "dVal" }}}}), "dVal", "a.b[1].d");
	equal($.templates("{{:a.b[~incr(1-1)].d}}").render({ a: { b: {1:{ d: "dVal" }}}}, { incr:function(val) { return val + 1; }}), "dVal", "a.b[~incr(1-1)].d");
	equal($.templates("{{:a.b.c.d}}").render({ a: { b: {'c':{ d: "dVal" }}}}), "dVal", "a.b.c.d");
	equal($.templates("{{:a[0]}}").render({ a: [ "bVal" ]}), "bVal", "a[0]");
	equal($.templates("{{:a.b[1][0].msg}}").render({ a: { b: [22,[{ msg: " yes - that's right. "}]] }}), " yes - that's right. ", "a.b[1][0].msg");
	equal($.templates("{{:#data.a}}").render({ a: "aVal" }), "aVal", "#data.a");
	equal($.templates("{{:#view.data.a}}").render({ a: "aVal" }), "aVal", "#view.data.a");
	equal($.templates("{{:#index === 0}}").render([{ a: "aVal" }]), "true", "#index");
});

test("types", function() {
	equal($.templates("{{:'abc'}}").render(), "abc", "'abc'");
	equal($.templates("{{:true}}").render(), "true", "true");
	equal($.templates("{{:false}}").render(), "false", "false");
	equal($.templates("{{:null}}").render(), "", 'null -> ""');
	equal($.templates("{{:199}}").render(), "199", "199");
	equal($.templates("{{: 199.9 }}").render(), "199.9", "| 199.9 |");
	equal($.templates("{{:-33.33}}").render(), "-33.33", "-33.33");
	equal($.templates("{{: -33.33 }}").render(), "-33.33", "| -33.33 |");
	equal($.templates("{{:-33.33 - 2.2}}").render(), "-35.53", "-33.33 - 2.2");
	equal($.templates("{{:notdefined}}").render({}), "", "notdefined");
});

test("Fallbacks for missing or undefined paths: using {{:some.path onError = 'fallback'}}, etc.", function() {
	equal($.templates("{{:a.missing.object.path}}").render({a:1}).slice(0, 19), "{Error: TypeError: ",
		"{{:a.missing.object.path}}");
	equal($.templates("{{:a.missing.object.path onError='Missing Object'}}").render({a:1}), "Missing Object",
		'{{:a.missing.object.path onError="Missing Object"}} -> "Missing Object"');
	equal($.templates("{{:a.missing.object.path onError=''}}").render({a:1}), "",
		'{{:a.missing.object.path onError=""}} -> ""');
	equal($.templates("{{>a.missing.object.path onError='Missing Object'}}").render({a:1}), "Missing Object",
		'{{>a.missing.object.path onError="Missing Object"}} -> "Missing Object"');
	equal($.templates("{{>a.missing.object.path onError=''}}").render({a:1}), "",
		'{{>a.missing.object.path onError=""}} -> ""');
	equal($.templates("{{>a.missing.object.path onError=defaultVal}}").render(
		{
			a:1,
			defaultVal: "defaultFromData"
		}), "defaultFromData",
		'{{>a.missing.object.path onError=defaultVal}} -> "defaultFromData"');

	equal($.templates("{{>a.missing.object.path onError=~myOnErrorFunction}}").render({a:1}, {
		myOnErrorFunction: function(e, view) {
			return "Override onError using a callback: " + view.ctx.helperValue + e.message;
		},
		helperValue: "hlp"
	}).slice(0, 38), "Override onError using a callback: hlp",
		'{{>a.missing.object.path onError=~myOnErrorFunction}}" >' +
		' Providing a function "onError=~myOnErrorFunction" calls the function as onError callback');

	equal($.templates("{{>a.missing.object.path onError=myOnErrorDataMethod}}").render(
		{
			a: "dataValue",
			myOnErrorDataMethod: function(e, view) {
				return "Override onError using a callback data method: " + view.data.a;
			}
		}), "Override onError using a callback data method: dataValue",
		'{{>a.missing.object.path onError=myOnErrorDataMethod}}" >' +
		' Providing a function "onError=myOnErrorDataMethod" calls the function as onError callback');

	equal($.templates("1: {{>a.missing.object.path onError=defaultVal}}" +
		" 2: {{:a.missing.object.path onError='Missing Object'}}" +
		" 3: {{:a.missing.object.path onError=''}}" +
		" 4: {{:a onError='missing'}}" +
		" 5: {{:a.undefined onError='missing'}}" +
		" 6: {{:a.missing.object onError=myCb}} end").render(
		{
			a:"aVal",
			defaultVal: "defaultFromData",
			myCb: function(e, view) {
				return "myCallback: " + view.data.a;
			}
		}), "1: defaultFromData 2: Missing Object 3:  4: aVal 5:  6: myCallback: aVal end",
		'multiple onError fallbacks in same template - correctly concatenated into output');

	equal($.templates({
		markup: "{{withfallback:a.notdefined fallback='fallback for undefined'}}",
		converters: {
			withfallback: function(val) {
				return val || this.tagCtx.props.fallback;
			}
		}
	}).render({a:"yes"}), "fallback for undefined",
		'{{withfallback:a.notdefined fallback="fallback for undefined"}} using converter to get fallback value for undefined properties');

	equal($.templates({
		markup: "1: {{withfallback:a.missing.y onError='Missing object' fallback='undefined prop'}}" +
			" 2: {{withfallback:a.undefined onError='Missing object' fallback='undefined prop'}}",
		converters: {
			withfallback: function(val) {
				return val || this.tagCtx.props.fallback;
			}
		}
	}).render({a:"yes"}), "1: Missing object 2: undefined prop",
		'both fallback for undefined and onError for missing on same tags');

	equal($.templates({
		markup: "1: {{>a.missing.object.path onError=defaultVal}}" +
		" 2: {{:a.missing.object.path onError='Missing Object'}}" +
		" 3: {{:a.missing.object.path onError=''}}" +
		" 4: {{:a onError='missing'}}" +
		" 5: {{:a.undefined onError='missing'}}" +
		" 6: {{:a.missing.object onError=myCb}}" +
		" 7: {{withfallback:a.undefined fallback='undefined prop'}} end",
		converters: {
			withfallback: function(val) {
				return val || this.tagCtx.props.fallback;
			}
		}
	}).render(
		{
		a:"aVal",
		defaultVal: "defaultFromData",
		myCb: function(e, view) {
			return "myCallback: " + view.data.a;
		}
	}), "1: defaultFromData 2: Missing Object 3:  4: aVal 5:  6: myCallback: aVal 7: undefined prop end",
	'multiple onError fallbacks or undefined property fallbacks in same template - correctly concatenated into output');

	equal($.templates({
		markup: "1: {{>a.missing.object.path onError=defaultVal}}" +
		" 2: {{:a.missing.object.path onError='Missing Object'}}" +
		" 3: {{:a.missing.object.path onError=''}}" +
		" 4: {{:a onError='missing'}}" +
		" 5: {{:a.missing.thisWillThrow.foo}}" +
		" 6: {{:a.undefined onError='missing'}}" +
		" 7: {{:a.missing.object onError=myCb}}" +
		" 8: {{withfallback:a.undefined fallback='undefined prop'}} end",
		converters: {
			withfallback: function(val) {
				return val || this.tagCtx.props.fallback;
			}
		}
	}).render(
		{
		a:"aVal",
		defaultVal: "defaultFromData",
		myCb: function(e, view) {
			return "myCallback: " + view.data.a;
		}
	}).slice(0, 19), "{Error: TypeError: ",
	'onError/fallback converter and regular thrown error message in same template: thrown error replaces the rest of the output (rather than concatenating)');

	equal($.templates("{{for missing.object.path onError='Missing Object'}}yes{{/for}}").render({a:1}), "Missing Object",
		'{{for missing.object.path onError="Missing Object"}} -> "Missing Object"');

	equal($.templates("{{for true missing.object.path onError='Missing Object'}}yes{{/for}}").render({a:1}), "Missing Object",
		'{{for true missing.object.path onError="Missing Object"}} -> "Missing Object"');

	equal($.templates("{{for true foo=missing.object.path onError='Missing Object'}}yes{{/for}}").render({a:1}), "Missing Object",
		'{{for ... foo=missing.object.path onError="Missing Object"}} -> "Missing Object"');

	equal($.templates("{{for true ~foo=missing.object.path onError='Missing Object'}}yes{{/for}}").render({a:1}), "Missing Object",
		'{{for ... ~foo=missing.object.path onError="Missing Object"}} -> "Missing Object"');

	equal($.templates({
			markup: "{{myTag foo='a'/}} {{myTag foo=missing.object.path onError='Missing Object'/}} {{myTag foo='c' bar=missing.object.path onError='Missing Object'/}} {{myTag foo='c' missing.object.path onError='Missing Object'/}} {{myTag foo='b'/}}",
			tags: {
				myTag: {template: "MyTag: {{:~tag.tagCtx.props.foo}} end"}
			}
		}).render({a:1}), "MyTag: a end Missing Object Missing Object Missing Object MyTag: b end",
		'onError=... for custom tags: e.g. {{myTag foo=missing.object.path onError="Missing Object"/}}');

	equal($.templates({
		markup: "1: {{for a.missing.object.path onError=defaultVal}}yes{{/for}}" +
		" 2: {{if a.missing.object.path onError='Missing Object'}}yes{{/if}}" +
		" 3: {{include a.missing.object.path onError=''/}}" +
		" 4: {{if a onError='missing'}}yes{{/if}}" +
		" 5: {{for a.undefined onError='missing'}}yes{{/for}}" +
		" 6: {{if a.missing.object onError=myCb}}yes{{/if}}" +
		" 7: {{withfallback:a.undefined fallback='undefined prop'}} end" +
		" 8: {{myTag foo=missing.object.path onError='Missing Object'/}}",
		converters: {
			withfallback: function(val) {
				return val || this.tagCtx.props.fallback;
			}
		},
		tags: {
			myTag: {template: "MyTag: {{:~tag.tagCtx.props.foo}} end"}
		}
	}).render(
		{
		a:"aVal",
		defaultVal: "defaultFromData",
		myCb: function(e, view) {
			return "myCallback: " + view.data.a;
		}
	}), "1: defaultFromData 2: Missing Object 3:  4: yes 5:  6: myCallback: aVal 7: undefined prop end 8: Missing Object",
	'multiple onError fallbacks or undefined property fallbacks in same template - correctly concatenated into output');

	equal($.templates({
		markup: "1: {{for a.missing.object.path onError=defaultVal}}yes{{/for}}" +
		" 2: {{if a.missing.object.path onError='Missing Object'}}yes{{/if}}" +
		" 3: {{include a.missing.object.path onError=''/}}" +
		" 4: {{if a onError='missing'}}yes{{/if}}" +
		" 5: {{for missing.thisWillThrow.foo}}yes{{/for}}" +
		" 6: {{for a.undefined onError='missing'}}yes{{/for}}" +
		" 7: {{if a.missing.object onError=myCb}}yes{{/if}}" +
		" 8: {{withfallback:a.undefined fallback='undefined prop'}} end",
		converters: {
			withfallback: function(val) {
				return val || this.tagCtx.props.fallback;
			}
		}
	}).render(
		{
		a:"aVal",
		defaultVal: "defaultFromData",
		myCb: function(e, view) {
			return "myCallback: " + view.data.a;
		}
	}).slice(0, 19), "{Error: TypeError: ",
	'onError/fallback converter and regular thrown error message in same template: thrown error replaces the rest of the output (rather than concatenating)');

});

test("comparisons", 22,function() {
	equal($.templates("{{:1<2}}").render(), "true", "1<2");
	equal($.templates("{{:2<1}}").render(), "false", "2<1");
	equal($.templates("{{:5===5}}").render(), "true", "5===5");
	equal($.templates("{{:0==''}}").render(), "true", "0==''");
	equal($.templates("{{:'ab'=='ab'}}").render(), "true", "'ab'=='ab'");
	equal($.templates("{{:2>1}}").render(), "true", "2>1");
	equal($.templates("{{:2 == 2}}").render(), "true", "2 == 2");
	equal($.templates("{{:2<=2}}").render(), "true", "2<=2");
	equal($.templates("{{:'ab'<'ac'}}").render(), "true", "'ab'<'ac'");
	equal($.templates("{{:3>=3}}").render(), "true", "3 =3");
	equal($.templates("{{:3>=2}}").render(), "true", "3>=2");
	equal($.templates("{{:3>=4}}").render(), "false", "3>=4");
	equal($.templates("{{:3 !== 2}}").render(), "true", "3 !== 2");
	equal($.templates("{{:3 != 2}}").render(), "true", "3 != 2");
	equal($.templates("{{:0 !== null}}").render(), "true", "0 !== null");
	equal($.templates("{{:(3 >= 4)}}").render(), "false", "3>=4");
	equal($.templates("{{:3 >= 4}}").render(), "false", "3>=4");
	equal($.templates("{{:(3>=4)}}").render(), "false", "3>=4");
	equal($.templates("{{:(3 < 4)}}").render(), "true", "3>=4");
	equal($.templates("{{:3 < 4}}").render(), "true", "3>=4");
	equal($.templates("{{:(3<4)}}").render(), "true", "3>=4");
	equal($.templates("{{:0 != null}}").render(), "true", "0 != null");
});

test("array access", function() {
	equal($.templates("{{:a[1]}}").render({ a: ["a0","a1"] }), "a1", "a[1]");
	equal($.templates("{{:a[1+1]+5}}").render({ a: [11,22,33] }), "38", "a[1+1]+5)");
	equal($.templates("{{:a[~incr(1)]+5}}").render({ a: [11,22,33] }, { incr:function(val) { return val + 1; }}), "38", "a[~incr(1)]+5");
	equal($.templates("{{:true && (a[0] || 'default')}}").render({ a: [0,22,33] }, { incr:function(val) { return val + 1; }}), "default", "true && (a[0] || 'default')");
});

test("context", 5, function() {
	equal($.templates("{{:~val}}").render(1, { val: "myvalue" }), "myvalue", "~val");
	function format(value, upper) {
		return value[upper ? "toUpperCase" : "toLowerCase"]();
	}
	equal($.templates("{{:~format(name) + ~format(name, true)}}").render(person, { format: format }), "joJO", "render(data, { format: formatFn }); ... {{:~format(name, true)}}");
	equal($.templates("{{for people[0]}}{{:~format(~type) + ~format(name, true)}}{{/for}}").render({ people: people}, { format: format, type: "PascalCase" }), "pascalcaseJO", "render(data, { format: formatFn }); ... {{:~format(name, true)}}");
	equal($.templates("{{for people ~twn=town}}{{:name}} lives in {{:~format(~twn, true)}}. {{/for}}").render({ people: people, town:"Redmond" }, { format: format }), "Jo lives in REDMOND. Bill lives in REDMOND. ", "Passing in context to nested templates: {{for people ~twn=town}}");
	equal($.templates("{{if true}}{{for people}}{{:~root.people[0].name}}{{/for}}{{/if}}").render({ people: people}), "JoJo", "{{:~root}} returns the top-level data");
});

test("values", 4, function() {
	equal($.templates("{{:a}}").render({ a: 0 }), "0", '{{:0}} returns "0"');
	equal($.templates("{{:a}}").render({}), "", "{{:undefined}} returns empty string");
	equal($.templates("{{:a}}").render({ a: "" }), "", "{{:''}} returns empty string");
	equal($.templates("{{:a}}").render({ a: null }), "", "{{:null}} returns empty string");
});

test("expressions", 18, function() {
	equal(compileTmpl("{{:a++}}"), "Syntax error\na++", "a++");
	equal(compileTmpl("{{:(a,b)}}"), "Syntax error\n(a,b)", "(a,b)");
	equal($.templates("{{: a+2}}").render({ a: 2, b: false }), "4", "a+2");
	equal($.templates("{{: b?'yes':'no' }}").render({ a: 2, b: false }), "no", "b?'yes':'no'");
	equal($.templates("{{:(a||-1) + (b||-1) }}").render({ a: 2, b: 0 }), "1", "a||-1");
	equal($.templates("{{:3*b()*!a*4/3}}").render({ a: false, b: function() { return 3; }}), "12", "3*b()*!a*4/3");
	equal($.templates("{{:a%b}}").render({ a: 30, b: 16}), "14", "a%b");
	equal($.templates("A_{{if v1 && v2 && v3 && v4}}no{{else !v1 && v2 || v3 && v4}}yes{{/if}}_B").render({v1:true,v2:false,v3:2,v4:"foo"}), "A_yes_B", "x && y || z");
	equal($.templates("{{:!true}}").render({}), "false", "!true");
	equal($.templates("{{if !true}}yes{{else}}no{{/if}}").render({}), "no", "{{if !true}}...");
	equal($.templates("{{:!false}}").render({}), "true", "!false");
	equal($.templates("{{if !false}}yes{{else}}no{{/if}}").render({}), "yes", "{{if !false}}...");
	equal($.templates("{{:!!true}}").render({}), "true", "!!true");
	equal($.templates("{{if !!true}}yes{{else}}no{{/if}}").render({}), "yes", "{{if !!true}}...");
	equal($.templates("{{:!(true)}}").render({}), "false", "!(true)");
	equal($.templates("{{:!true === false}}").render({}), "true", "!true === false");
	equal($.templates("{{:false === !true}}").render({}), "true", "false === !true");
	equal($.templates("{{:false === !null}}").render({}), "false", "false === !null");
});

module("{{for}}");
test("{{for}}", 17, function() {
	$.templates({
		forTmpl: "header_{{for people}}{{:name}}{{/for}}_footer",
		templateForArray: "header_{{for #data}}{{:name}}{{/for}}_footer",
		pageTmpl: '{{for [people] tmpl="templateForArray"/}}',
		simpleFor: "a{{for people}}Content{{:#data}}|{{/for}}b",
		forPrimitiveDataTypes: "a{{for people}}|{{:#data}}{{/for}}b",
		testTmpl: "xxx{{:name}} {{:~foo}}"
	});

	equal($.render.forTmpl({ people: people }), "header_JoBill_footer", '{{for people}}...{{/for}}');
	equal($.render.templateForArray([people]), "header_JoBill_footer", 'Can render a template against an array, as a "layout template", by wrapping array in an array');
	equal($.render.pageTmpl({ people: people }), "header_JoBill_footer", '{{for [people] tmpl="templateForArray"/}}');
	equal($.templates("{{for}}xxx{{:name}} {{:~foo}}{{/for}}").render({name: "Jeff"},{foo:"fooVal"}), "xxxJeff fooVal", "no parameter - renders once with parent #data context: {{for}}");
	equal($.templates("{{for tmpl='testTmpl'/}}").render({name: "Jeff"},{foo:"fooVal"}), "xxxJeff fooVal", ": {{for tmpl=.../}} no parameter - equivalent to {{include tmpl=.../}} - renders once with parent #data context");
	equal($.templates("{{include tmpl='testTmpl'/}}").render({name: "Jeff"},{foo:"fooVal"}), "xxxJeff fooVal", "{{include tmpl=.../}} with tmpl parameter - renders once with parent #data context. Equivalent to {{for tmpl=.../}}");
	equal($.templates("{{for missingProperty}}xxx{{:#data===~undefined}}{{/for}}").render({}), "", "missingProperty - renders empty string");
	equal($.templates("{{for null}}xxx{{:#data===null}}{{/for}}").render(), "xxxtrue", "null - renders once with #data null: {{for null}}");
	equal($.templates("{{for false}}xxx{{:#data}}{{/for}}").render(), "xxxfalse", "false - renders once with #data false: {{for false}}");
	equal($.templates("{{for 0}}xxx{{:#data}}{{/for}}").render(), "xxx0", "0 - renders once with #data false: {{for 0}}");
	equal($.templates("{{for ''}}xxx{{:#data===''}}{{/for}}").render(), "xxxtrue", "'' - renders once with #data false: {{for ''}}");
	equal($.templates("{{for #data}}{{:name}}{{/for}}").render(people), "JoBill", "If #data is an array, {{for #data}} iterates");

	equal($.render.simpleFor({people:[]}), "ab", 'Empty array renders empty string');
	equal($.render.simpleFor({people:["", false, null, undefined, 1]}), "aContent|Contentfalse|Content|Content|Content1|b", 'Empty string, false, null or undefined members of array are also rendered');
	equal($.render.simpleFor({people:null}), "aContent|b", 'null is rendered once with #data null');
	equal($.render.simpleFor({}), "ab", 'if #data is undefined, renders empty string');
	equal($.render.forPrimitiveDataTypes({people:[0, 1, "abc", "", ,null ,true ,false]}), "a|0|1|abc||||true|falseb", 'Primitive types render correctly, even if falsey');
});

module("{{props}}");
test("{{props}}", 15, function() {
	$.templates({
		propsTmpl: "header_{{props person}}Key: {{:key}} - Prop: {{:prop}}| {{/props}}_footer",
		propsTmplObjectArray: "header_{{props people}}Key: {{:key}} - Prop: {{for prop}}{{:name}} {{/for}}{{/props}}_footer",
		propsTmplPrimitivesArray: "header_{{props people}}Key: {{:key}} - Prop: {{for prop}}{{:name}} {{/for}}{{/props}}_footer",
		templatePropsArray: "header_{{props #data}}Key: {{:key}} - Prop: {{for prop}}{{:name}} {{/for}}{{/props}}_footer",
		propTmpl: "Key: {{:key}} - Prop: {{:prop}}",
		pageTmpl: '{{props person tmpl="propTmpl"/}}',
		simpleProps: "a{{props people}}Content{{:#data}}|{{/props}}b",
		propsPrimitiveDataTypes: "a{{props people}}|{{:#data}}{{/props}}b",
		testTmpl: "xxx{{:name}} {{:~foo}}"
	});

	equal($.render.propsTmpl({ person: people[0] }), "header_Key: name - Prop: Jo| _footer", '{{props person}}...{{/props}} for an object iterates over properties');
	equal($.render.propsTmplObjectArray({ people: people }), "header_Key: 0 - Prop: Jo Key: 1 - Prop: Bill _footer", '{{props people}}...{{/props}} for an array iterates over the array - with index as key and object a prop');
	equal($.render.templatePropsArray([people]), "header_Key: 0 - Prop: Jo Key: 1 - Prop: Bill _footer", 'Can render a template against an array, as a "layout template", by wrapping array in an array');
	equal($.render.pageTmpl({ person: people[0] }), "Key: name - Prop: Jo", '{{props person tmpl="propTmpl"/}}');
	equal($.templates("{{props}}{{:key}} {{:prop}}{{/props}}").render({name: "Jeff"}), "name Jeff", "no parameter - defaults to current data item");
	equal($.templates("{{props foo}}xxx{{:key}} {{:prop}} {{:~foo}}{{/props}}").render({name: "Jeff"}), "", "undefined arg - renders nothing");
	equal($.templates("{{props tmpl='propTmpl'/}}").render({name: "Jeff"}), "Key: name - Prop: Jeff", ": {{props tmpl=.../}} no parameter - defaults to current data item");

	equal($.templates("{{props null}}Key: {{:key}} - Prop: {{:prop}}| {{/props}}").render(), "", "null - renders nothing");
	equal($.templates("{{props false}}Key: {{:key}} - Prop: {{:prop}}| {{/props}}").render(), "", "false - renders nothing");
	equal($.templates("{{props 0}}Key: {{:key}} - Prop: {{:prop}}| {{/props}}").render(), "", "0 - renders nothing");
	equal($.templates("{{props 'abc'}}Key: {{:key}} - Prop: {{:prop}}| {{/props}}").render(), "", "'abc' - renders nothing");
	equal($.templates("{{props ''}}Key: {{:key}} - Prop: {{:prop}}| {{/props}}").render(), "", "'' - renders nothing");
	equal($.templates("{{props #data}}Key: {{:key}} - Prop: {{:prop}}| {{/props}}").render(people),
	"Key: name - Prop: Jo| Key: name - Prop: Bill| ",
	"If #data is an array, {{props #data}} iterates");

	equal($.render.propsTmpl({person:{}}), "header__footer", 'Empty object renders empty string');
	equal($.render.propsTmpl({person:{zero: 0, one: 1, str: "abc", emptyStr: "", nullVal: null , trueVal: true , falseVal: false}}),
	"header_Key: zero - Prop: 0| Key: one - Prop: 1| Key: str - Prop: abc| Key: emptyStr - Prop: | Key: nullVal - Prop: | Key: trueVal - Prop: true| Key: falseVal - Prop: false| _footer",
	'Primitive types render correctly, even if falsey');
});

module("api");
test("templates", 14, function() {
	var tmpl = $.templates(tmplString);
	equal(tmpl.render(person), "A_Jo_B", 'Compile from string: var tmpl = $.templates(tmplString);');

	var fnToString = tmpl.fn.toString();
	equal($.templates("", tmplString).fn.toString() === fnToString && $.templates(null, tmplString).fn.toString() === fnToString && $.templates(undefined, tmplString).fn.toString() === fnToString, true,
	'if name is "", null, or undefined, then $.templates(name, tmplString) = $.templates(tmplString);');

	$.templates("myTmpl", tmplString);
	equal($.render.myTmpl(person), "A_Jo_B", 'Compile and register named template: $.templates("myTmpl", tmplString);');

	$.templates({ myTmpl2: tmplString, myTmpl3: "X_{{:name}}_Y" });
	equal($.render.myTmpl2(person) + $.render.myTmpl3(person), "A_Jo_BX_Jo_Y", 'Compile and register named templates: $.templates({ myTmpl: tmplString, myTmpl2: tmplString2 });');

	$.templates("!'-#==", "x");
	$.templates({ '&^~>"2': "y" });
	equal($.render["!'-#=="](person) + $.render['&^~>"2'](person), "xy", 'Named templates can have arbitrary names;');

	$.templates({ myTmpl4: "A_B" });
	equal($.render.myTmpl4(person), "A_B", '$.templates({ myTmpl: htmlWithNoTags });');


	$.templates({
		myTmpl5: {
			markup: tmplString
		}
	});
	equal($.render.myTmpl5(person), "A_Jo_B", '$.templates("myTmpl", tmplObjWithMarkupString);');

	equal($.templates("", { markup: tmplString }).render(person), "A_Jo_B", 'Compile from template object without registering: $.templates("", tmplObjWithMarkupString);');

	$.templates({
		myTmpl6: {
			markup: tmplString
		}
	});
	equal($.render.myTmpl6(person), "A_Jo_B", '$.templates("myTmpl", tmplObjWithMarkupString);');

	$.templates("myTmpl7", tmpl);
	equal($.render.myTmpl7(person), "A_Jo_B", 'Cloning a template: $.templates("newName", tmpl);');

	equal($.templates("", tmpl) === tmpl, true, '$.templates(tmpl) returns tmpl');

	equal($.templates("").render(), "", '$.templates("") is a template with empty string as content');

	$.templates("myEmptyTmpl", "");
	equal($.templates.myEmptyTmpl.render(), "", '$.templates("myEmptyTmpl", "") is a template with empty string as content');

	$.templates("myTmpl", null);
	equal($.templates.myTmpl, undefined, 'Remove a named template: $.templates("myTmpl", null);');
});

test("render", 25, function() {
	var tmpl1 = $.templates("myTmpl8", tmplString);
	$.templates({
		simple: "Content{{:#data}}|",
		templateForArray: "Content{{for #data}}{{:#index}}{{/for}}{{:~foo}}",
		primitiveDataTypes: "|{{:#data}}"
	});

	equal(tmpl1.render(person), "A_Jo_B", 'tmpl1.render(data);');
	equal($.render.myTmpl8(person), "A_Jo_B", '$.render.myTmpl8(data);');

	$.templates("myTmpl9", "A_{{for}}inner{{:name}}content{{/for}}_B");
	equal($.templates.myTmpl9.tmpls[0].render(person), "innerJocontent", 'Access nested templates: $.templates["myTmpl9[0]"];');

	$.templates("myTmpl10", "top index:{{:#index}}|{{for 1}}nested index:{{:#get('item').index}}|{{if #get('item').index===0}}nested if index:{{:#get('item').index}}|{{else}}nested else index:{{:#get('item').index}}|{{/if}}{{/for}}");

	equal($.render.myTmpl10(people), "top index:0|nested index:0|nested if index:0|top index:1|nested index:1|nested else index:1|",
										"#get('item').index gives the integer index even in nested blocks");

	$.templates("myTmpl11", "top index:{{:#index}}|{{for people}}nested index:{{:#index}}|{{if #index===0}}nested if index:{{:#get('item').index}}|{{else}}nested else index:{{:#get('item').index}}|{{/if}}{{/for}}");

	equal($.render.myTmpl11({ people: people }), "top index:|nested index:0|nested if index:0|nested index:1|nested else index:1|",
										"#get('item').index gives the integer index even in nested blocks");

	$.views.tags({
		myWrap: {}
	});

	var templateWithIndex = $.templates(
			'{{for people}}'
			+ 'a{{:#index}} '
			+ '{{if true}}b{{:#index}}{{/if}} '
			+ 'c{{:#index}} '
			+ '{{myWrap}}d{{:#index}} {{/myWrap}}'
		+ '{{/for}}');

		$.views.settings.debugMode(false);

		equal(templateWithIndex.render({people: [1,2]}),
			"a0 b c0 d a1 b c1 d ",
			"If debug mode is false, #index gives empty string in nested blocks. No error message");

		$.views.settings.debugMode(true);

		equal(templateWithIndex.render({people: [1,2]}),
			"a0 bUnavailable (nested view): use #getIndex() c0 dUnavailable (nested view): use #getIndex() a1 bUnavailable (nested view): use #getIndex() c1 dUnavailable (nested view): use #getIndex() ",
			"If debug mode is true, #index gives error message in nested blocks.");

	var templateWithGetIndex = $.templates(
			'{{for people}}'
			+ 'a{{:#getIndex()}} '
			+ '{{if true}}b{{:#getIndex()}}{{/if}} '
			+ 'c{{:#getIndex()}} '
			+ '{{myWrap}}d{{:#getIndex()}} {{/myWrap}}'
		+ '{{/for}}');

		equal(templateWithGetIndex.render({people: [1,2]}),
			"a0 b0 c0 d0 a1 b1 c1 d1 ",
			"#getIndex gives inherited index in nested blocks.");

	$.views.helpers({ myKeyIsCorrect: function() {
		var view = this;
		return view.parent.views[view._.key] === view;
	}});
	$.templates("myTmpl12", "{{for people}}nested {{:~myKeyIsCorrect()}}|{{if #index===0}}nested if {{:~myKeyIsCorrect()}}|{{else}}nested else {{:~myKeyIsCorrect()}}|{{/if}}{{/for}}");

	equal($.render.myTmpl12({ people: people }), "nested true|nested if true|nested true|nested else true|",
										'view._key gives the key of this view in the parent views collection/object');

	equal($.templates(tmplString).render(person), "A_Jo_B", 'Compile from string: var html = $.templates(tmplString).render(data);');
	equal($.render.myTmpl8(people), "A_Jo_BA_Bill_B", '$.render.myTmpl(array);');
	equal($.render.simple([]), "", 'Empty array renders empty string');
	equal($.render.simple(["",false,null,undefined,1]), "Content|Contentfalse|Content|Content|Content1|", 'Empty string, false, null or undefined members of array are also rendered');
	equal($.render.simple(null), "Content|", 'null renders once with #data null');
	equal($.render.simple(), "Content|", 'Undefined renders once with #data undefined');
	equal($.render.simple(false), "Contentfalse|", 'false renders once with #data false');
	equal($.render.simple(0), "Content0|", '0 renders once with #data 0');
	equal($.render.simple(""), "Content|", '"" renders once with #data ""');

	equal($.render.templateForArray([[null,undefined,1]]), "Content012", 'Can render a template against an array without iteration, by wrapping array in an array');
	equal($.render.templateForArray([null,undefined,1], true), "Content012", 'render(array, true) renders an array without iteration');
	equal($.render.templateForArray([null,undefined,1], {foo:"foovalue"}, true), "Content012foovalue", 'render(array, helpers, true) renders an array without iteration, while passing in helpers');
	equal($.render.templateForArray([[]]), "Content", 'Can render a template against an empty array without iteration, by wrapping array in an array');
	equal($.render.templateForArray([], true), "Content", 'Can render a template against an empty array without iteration, by passing in true as second parameter');
	equal($.render.templateForArray([], {foo: "foovalue"}, true), "Contentfoovalue", 'Can render a template against an empty array without iteration, by by passing in true as third parameter');
	equal($.render.primitiveDataTypes([0,1,"abc","",,true,false]), "|0|1|abc|||true|false", 'Primitive types render correctly, even if falsey');
});

test("converters", function() {
	function loc(data) {
		switch (data) { case "desktop": return "bureau"; }
		return data;
	}
	$.views.converters({ loc2: loc });
	equal($.templates("{{loc2:#data}}:{{loc2:'desktop'}}").render("desktop"), "bureau:bureau", "$.views.converters({ loc: locFunction })");

	var locFn = $.views.converters("loc", loc);
	equal(locFn === loc && $.views.converters.loc === loc && $.views.converters.loc2 === loc, true, 'locFunction === $.views.converters.loc === $.views.converters.loc2');

	$.views.converters({ loc2: null});
	equal($.views.converters.loc2, undefined, '$.views.converters({ loc2: null }) to remove registered converter');

	equal($.templates("{{attr:a}}").render({ a: 0 }), "0", '{{attr:0}} returns "0"');
	equal($.templates("{{attr:a}}").render({}), "", "{{attr:undefined}} returns empty string");
	equal($.templates("{{attr:a}}").render({ a: "" }), "", "{{attr:''}} returns empty string");
	equal($.templates("{{attr:a}}").render({ a: null }), "", '{{attr:null}} returns empty string');
	equal($.templates("{{attr:a}}").render({ a: "<>&'" + '"'}), "&lt;&gt;&amp;&#39;&#34;", '{{attr:"<>&' + "'" + '}} returns "&lt;&gt;&amp;&#39;&#34;"');

	equal($.templates("{{>a}}").render({ a: 0 }), "0", '{{>0}} returns "0"');
	equal($.templates("{{>a}}").render({}), "", "{{>undefined}} returns empty string");
	equal($.templates("{{>a}}").render({ a: "" }), "", "{{>''}} returns empty string");
	equal($.templates("{{>a}}").render({ a: null }), "", "{{>null}} returns empty string");
	equal($.templates("{{>a}}").render({ a: "<>&'" + '"'}), "&lt;&gt;&amp;&#39;&#34;", '{{>"<>&' + "'" + '}} returns "&lt;&gt;&amp;&#39;&#34;"');

	equal($.templates("{{loc:a}}").render({ a: 0 }), "0", '{{cnvt:0}} returns "0"');
	equal($.templates("{{loc:a}}").render({}), "", '{{cnvt:undefined}} returns empty string');
	equal($.templates("{{loc:a}}").render({ a: "" }), "", "{{cnvt:''}} returns empty string");
	equal($.templates("{{loc:a}}").render({ a: null }), "", "{{cnvt:null}} returns empty string");

	equal($.templates("{{attr:a}}|{{>a}}|{{loc:a}}|{{:a}}").render({}), "|||", "{{attr:undefined}}|{{>undefined}}|{{loc:undefined}}|{{:undefined}} returns correct values");
	equal($.templates("{{attr:a}}|{{>a}}|{{loc:a}}|{{:a}}").render({a:0}), "0|0|0|0", "{{attr:0}}|{{>0}}|{{loc:0}}|{{:0}} returns correct values");
	equal($.templates("{{attr:a}}|{{>a}}|{{loc:a}}|{{:a}}").render({a:false}), "false|false|false|false", "{{attr:false}}|{{>false}}|{{loc:false}}|{{:false}} returns correct values");
});

test("{{sometag convert=converter}}", function() {
	function loc(data) {
		switch (data) {
			case "desktop": return "bureau";
			case "a<b": return "a moins <que b"}
		return data;
	}
	$.views.converters("loc", loc);

	equal($.templates("1{{:#data convert='loc'}} 2{{:'desktop' convert='loc'}} 3{{:#data convert=~myloc}} 4{{:'desktop' convert=~myloc}}").render("desktop", {myloc: loc}), "1bureau 2bureau 3bureau 4bureau", "{{: convert=~myconverter}}");
	equal($.templates("1:{{:'a<b' convert=~myloc}} 2:{{> 'a<b'}} 3:{{html: 'a<b' convert=~myloc}} 4:{{> 'a<b' convert=~myloc}} 5:{{attr: 'a<b' convert=~myloc}}").render(1, {myloc: loc}),
		"1:a moins <que b 2:a&lt;b 3:a&lt;b 4:a&lt;b 5:a moins <que b",
		"{{foo: convert=~myconverter}} convert=converter is used rather than {{foo:, but with {{html: convert=~myconverter}} or {{> convert=~myconverter}} html converter takes precedence and ~myconverter is ignored");
	equal($.templates("{{if true convert=~invert}}yes{{else false convert=~invert}}no{{else}}neither{{/if}}").render('desktop', {invert: function(val) {return !val}}), "no", "{{if expression convert=~myconverter}}...{{else expression2 convert=~myconverter}}... ");
	equal($.templates("{{for #data convert=~reverse}}{{:#data}}{{/for}}").render([1,2,3], {reverse: function(val) {return val.reverse()}}, true), "321", "{{for expression convert=~myconverter}}");
});

test("tags", function() {
	equal($.templates("{{sort people reverse=true}}{{:name}}{{/sort}}").render({ people: people }), "BillJo", "$.views.tags({ sort: sortFunction })");

	equal($.templates("{^{sort people reverse=true}}{^{:name}}{{/sort}}").render({ people: people }), "BillJo", "Calling render() with inline data-binding {^{...}} renders normally without binding");

	equal($.templates("{{sort people reverse=true towns}}{{:name}}{{/sort}}").render({ people: people, towns:towns }), "DelhiParisSeattleBillJo", "Multiple parameters in arbitrary order: {{sort people reverse=true towns}}");

	equal($.templates("{{sort reverse=false people reverse=true towns}}{{:name}}{{/sort}}").render({ people: people, towns:towns }), "DelhiParisSeattleBillJo", "Duplicate named parameters - last wins: {{sort reverse=false people reverse=true towns}}");

	var sort2 = $.views.tags("sort2", sort);
	equal(sort2.render === sort && $.views.tags.sort.render === sort && $.views.tags.sort2.render === sort, true, 'sortFunction === $.views.tags.sort.render === $.views.tags.sort2.render');

	$.views.tags("sort2", null);
	equal($.views.tags.sort2, undefined, '$.views.tags("sort2", null) to remove registered tag');

	$.views.tags("boldTag", {
		render: function() {
			return "<em>" + this.tagCtx.render() + "</em>";
		},
		template: "{{:#data}}"
	});
	equal($.templates("{{boldTag}}{{:#data}}{{/boldTag}}").render("theData"), "<em>theData</em>",
		'Data context inside a block tag using tagCtx.render() is the same as the outer context');

	equal($.templates("{{boldTag/}}").render("theData"), "<em>theData</em>",
		'Data context inside the built-in template of a self-closing tag using tagCtx.render() is the same as the outer context');

	equal($.templates("{{sort people reverse=true}}{{:name}}{{/sort}}").render({ people: people }), "BillJo", "$.views.tags({ sort: sortFunction })");

	// =============================== Arrange ===============================
	// ................................ Act ..................................
	var eventData = "",

		renderedOutput = $.templates({
			markup: '{^{myWidget name/}}',
			tags: {
				myWidget: {
					init: function(tagCtx, linkCtx) {
						eventData += " init";
					},
					render: function(name, things) {
						eventData += " render";
						return name + " " + this.getType();
					},
					getType: function() {
						eventData += " getType";
						return this.type;
					},
					type: "special"
				}
			}
		}).render(person);

	// ............................... Assert .................................
	equal(renderedOutput + "|" + eventData, "Jo special| init render getType", '{^{myWidget/}} - Events fire in order during rendering: render, onBeforeLink and onAfterLink');

	// =============================== Arrange ===============================
	$.views.tags({
		noRenderNoTemplate: {},
		voidRender: function() {},
		emptyRender: function() { return ""; },
		emptyTemplate: {
			template: ""
		},
		templateReturnsEmpty: {
			template: "{{:a}}",
			autoBind: true
		},
		tagInitIsFalse: {
			init:false,
			render: function(){
				return "Foo" + JSON.stringify(this.__proto__ || {});
			}
		},
		tagInitIsFalseWithTemplate: {
			init:false,
			template: "Foo "
		}

	});

	// ............................... Assert .................................
	equal($.templates("a{{noRenderNoTemplate/}}b{^{noRenderNoTemplate/}}c{{noRenderNoTemplate}}{{/noRenderNoTemplate}}d{^{noRenderNoTemplate}}{{/noRenderNoTemplate}}e").render(1), "abcde",
	"non-rendering tag (no template, no render function) renders empty string");

	equal($.templates("a{{voidRender/}}b{^{voidRender/}}c{{voidRender}}{{/voidRender}}d{^{voidRender}}{{/voidRender}}e").render(1), "abcde",
	"non-rendering tag (no template, no return from render function) renders empty string");

	equal($.templates("a{{emptyRender/}}b{^{emptyRender/}}c{{emptyRender}}{{/emptyRender}}d{^{emptyRender}}{{/emptyRender}}e").render(1), "abcde",
	"non-rendering tag (no template, empty string returned from render function) renders empty string");

	equal($.templates("a{{emptyTemplate/}}b{^{emptyTemplate/}}c{{emptyTemplate}}{{/emptyTemplate}}d{^{emptyTemplate}}{{/emptyTemplate}}e").render(1), "abcde",
	"non-rendering tag (template has no content, no render function) renders empty string");

	equal($.templates("a{{templateReturnsEmpty/}}b{^{templateReturnsEmpty/}}c{{templateReturnsEmpty}}{{/templateReturnsEmpty}}d{^{templateReturnsEmpty}}{{/templateReturnsEmpty}}e").render(1), "abcde",
	"non-rendering tag (template returns empty string, no render function) renders empty string");

	equal($.views.tags.tagInitIsFalse.constructor === Object && $.templates("a{{tagInitIsFalse/}}b{^{tagInitIsFalse/}}c{{tagInitIsFalse}}{{/tagInitIsFalse}}d{^{tagInitIsFalse}}{{/tagInitIsFalse}}e").render(1), "aFoo{}bFoo{}cFoo{}dFoo{}e",
	"Tag with init:false renders with render method - and has no prototype or constructor (plain object)");

	equal($.views.tags.tagInitIsFalseWithTemplate.constructor === Object && $.templates("a{{tagInitIsFalseWithTemplate/}}b{^{tagInitIsFalseWithTemplate/}}c{{tagInitIsFalseWithTemplate}}{{/tagInitIsFalseWithTemplate}}d{^{tagInitIsFalseWithTemplate}}{{/tagInitIsFalseWithTemplate}}e").render(1), "aFoo bFoo cFoo dFoo e",
	"Tag with init:false and template renders template");

	$.views.tags({
		tagJustTemplate: {
			template: "{{:#data ? name||length : 'Not defined'}} ",
			autoBind: true
		},
		tagWithTemplateWhichIteratesAgainstCurrentData: {
			template: "{{:#data ? name : 'Not defined'}} ",
			render: function() {
				return this.tagCtx.render(); // Renders against current data - and iterates if array
			},
			autoBind: true
		},
		tagJustRender: {
			render: function(val) {
				return val.name + " ";
			},
			autoBind: true
		},
		tagJustRenderArray: {
			render: function(val) {
				return val.length + " ";
			},
			autoBind: true
		},
		tagWithTemplateNoIteration: {
			render: function(val) {
				return this.tagCtx.render(val, true); // Render without iteration
			},
			template: "{{:#data.length}} ",
			autoBind: true
		},
		tagWithTemplateNoIterationWithHelpers: {
			render: function(val) {
				return this.tagCtx.render(val, {foo: "foovalue"}, true); // Render without iteration
			},
			template: "{{:#data.length}} {{:~foo}}",
			autoBind: true
		},
		tagWithTemplateWhichIteratesFirstArg: {
			template: "{{:#data ? name : 'Not defined'}} ",
			render: function(val) {
				return this.tagCtx.render(val); // Renders against first arg - defaults to current data - and iterates if array
			},
			autoBind: true
		}
	});

	equal($.templates("a{{include person}}{{tagJustTemplate/}}{{/include}}").render({person: {name: "Jo"}}), "aJo ",
	"Tag with just a template and no param renders once against current data, if object");

	equal($.templates("a{{include person}}{{tagJustTemplate undefinedProperty/}}{{/include}}").render({person: {name: "Jo"}}), "aNot defined ",
	"Tag with just a template and a parameter which is not defined renders once against 'undefined'");

	equal($.templates("a{{include people}}{{tagJustTemplate/}}{{/include}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "a2 ",
	"Tag with just a template and no param renders once against current data, even if array - but can add render method with tagCtx.render(val) to iterate - (next test)");

	equal($.templates("a{{include people}}{{tagWithTemplateWhichIteratesAgainstCurrentData/}}{{/include}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "aJo Mary ",
	"Tag with a template and no param and render method calling tagCtx.render() iterates against current data if array");

	equal($.templates("a{{include people}}{{tagWithTemplateWhichIteratesAgainstCurrentData thisisignored/}}{{/include}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "aJo Mary ",
	"Tag with a template and no param and render method calling tagCtx.render() iterates against current data if array - and ignores argument if provided");

	equal($.templates("a{{include people}}{{tagWithTemplateWhichIteratesFirstArg/}}{{/include}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "aJo Mary ",
	"Tag with a template and no param and render method calling tagCtx.render(val) renders against first arg - or defaults to current data, and iterates if array");

	equal($.templates("a{{tagWithTemplateWhichIteratesFirstArg people/}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "aJo Mary ",
	"Tag with a template and no param and render method calling tagCtx.render(val) iterates against argument if array");

	equal($.templates("a{{include people}}{{tagWithTemplateNoIteration/}}{{/include}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "a2 ",
	"If current data is an array, a tag with a template and a render method calling tagCtx.render(val, true) and no param renders against array without iteration");

	equal($.templates("a{{include people}}{{tagWithTemplateNoIterationWithHelpers/}}{{/include}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "a2 foovalue",
	"If current data is an array, a tag with a template and a render method calling tagCtx.render(val, helpers, true) and no param renders against array without iteration");

	equal($.templates("a{{include person}}{{tagJustRender/}}{{/include}}").render({person: {name: "Jo"}}), "aJo ",
	"Tag with just a render and no param renders once against current data, if object");

	equal($.templates("a{{include people}}{{tagJustRenderArray/}}{{/include}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "a2 ",
	"Tag with just a render and no param renders once against current data, even if array - but render method can choose to iterate");

	equal($.templates("a{{tagJustTemplate person/}}").render({person: {name: "Jo"}}), "aJo ",
	"Tag with just a template and renders once against first argument data, if object");

	equal($.templates("a{{tagJustTemplate people/}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "a2 ",
	"Tag with just a template renders once against first argument data even if it is an array - but can add render method with tagCtx.render(val) to iterate - (next test)");

	equal($.templates("a{{tagWithTemplateWhichIteratesFirstArg people/}}").render({people: [{name: "Jo"}, {name: "Mary"}]}), "aJo Mary ",
	"Tag with a template and render method calling tagCtx.render(val) renders against first param data, and iterates if array");

});

test('{{include}} and wrapping content', function() {
	var result = $.templates({
			markup:
					'Before {{include tmpl="wrapper"}}'
					+ '{{:name}}'
				+ '{{/include}} After',
			templates: {
				wrapper: "header{{include tmpl=#content/}}footer"
			}
		}).render(people);

	equal(result, "Before headerJofooter AfterBefore headerBillfooter After", 'Using {{include ... tmpl="wrapper"}}}wrapped{{/include}}');

	result = $.templates({
		markup:
				'This replaces:{{myTag override="replacementText" tmpl="wrapper"}}'
				+ '{{:name}}'
			+ '{{/myTag}}'
			+ 'This wraps:{{myTag tmpl="wrapper"}}'
				+ '{{:name}}'
			+ '{{/myTag}}',
		tags: {
			myTag: {
				template: "add{{include tmpl=#content/}}",
				render: function() {
					return this.tagCtx.props.override;
				},
				autoBind: true
			}
		},
		templates: {
			wrapper: "header{{include tmpl=#content/}}footer"
		}
	}).render(people);

	equal(result, "This replaces:replacementTextThis wraps:headerJofooterThis replaces:replacementTextThis wraps:headerBillfooter", 'Custom tag with wrapped content: {{myTag ... tmpl="wrapper"}}wrapped{{/myTmpl}}');

	result = $.templates({
		markup:
				'Before {{include tmpl="wrapper"}}'
				+ '{{:name}}'
			+ '{{/include}} After',
		templates: {
			wrapper: "header{{for people tmpl=#content/}}footer"
		}
	}).render({people: people});

	equal(result, "Before headerJoBillfooter After", 'Using {{for ... tmpl="wrapper"}}}wrapped{{/for}}');

	result = $.templates({
		markup:
				'This replaces:{{myTag override="replacementText"}}'
				+ '{{:name}}'
			+ '{{/myTag}}'
			+ 'This wraps:{{myTag tmpl="wrapper"}}'
				+ '{{:name}}'
			+ '{{/myTag}}',
		tags: {
			myTag: {
				render: function() {
					return this.tagCtx.props.override;
				},
				autoBind: true
			},
		},
		templates: {
			wrapper: "header{{for people tmpl=#content/}}footer"
		}
	}).render({people: people});

	equal(result, "This replaces:replacementTextThis wraps:headerJoBillfooter", 'Using {{myTag ... tmpl="wrapper"}}wrapped{{/myTmpl}}');
});

test("helpers", 4, function() {
	$.views.helpers({
		not: function(value) {
			return !value;
		},
		concat: function() {
			return "".concat.apply("", arguments) + "top";
		}
	});
	equal($.templates("{{:~concat(a, 'b', ~not(false))}}").render({ a: "aVal" }), "aValbtruetop", "~concat('a')");

	function toUpperCase(value) {
		return value.toUpperCase();
	}
	var toUpperCaseFn = $.views.helpers("toUpperCase", toUpperCase);
	equal($.templates("{{:~toUpperCase(name)}} {{:~toUpperCase('Foo')}}").render(person), "JO FOO", '$.views.helpers("toUpperCase", toUpperCaseFn);... {{:~toUpperCase(name)}}');

	$.views.helpers({ toUpperCase2: toUpperCase });
	equal(toUpperCaseFn === toUpperCase && $.views.helpers.toUpperCase === toUpperCase && $.views.helpers.toUpperCase2 === toUpperCase, true, 'sortFunction === $.views.helpers.toUpperCase === $.views.helpers("toUpperCase")');

	$.views.helpers("toUpperCase2", null);
	equal($.views.helpers.toUpperCase2, undefined, '$.views.helpers("toUpperCase2", null) to remove registered helper');
});

test("settings", function() {
	// ................................ Act ..................................
	$.views.settings.delimiters("@%","%@");
	var result = $.templates("A_@%if true%@yes@%/if%@_B").render();
	$.views.settings.delimiters("{{","}}");
	result += "|" +  $.templates("A_{{if true}}YES{{/if}}_B").render();
	// ............................... Assert .................................
	equal(result, "A_yes_B|A_YES_B", "Custom delimiters with render()");

	// =============================== Arrange ===============================
	var app = {choose: true, name: "Jo"};
	result = "";
	var oldOnError = $.views.settings.onError;

	$.views.settings({
		onError: function(e, view, fallback) {
			return "Override error - " + (fallback ? ("(Fallback string: " + fallback + ") ") : "") + (view ? "Rendering error: " + e.message : "JsViews error: " + e);
		}
	});

	// ................................ Act ..................................
	result = $.templates('{{:missing.object}}').render(app);

	// ............................... Assert .................................
	equal(result.slice(0, 34), "Override error - Rendering error: ", "Override onError()");

	// ................................ Act ..................................
	result = $.templates('{{:missing.object onError="myFallback"}}').render(app);

	// ............................... Assert .................................
	equal(result.slice(0, 64), "Override error - (Fallback string: myFallback) Rendering error: ", 'Override onError() - with {{:missing.object onError="myFallback"}}');

	// ................................ Act ..................................
	try {
		$.templates('{{if}}').render(app);
	}
	catch (e) {
		result = e.message;
	}

	// ............................... Assert .................................
	equal(result, 'Override error - JsViews error: Syntax error\nUnmatched or missing tag: "{{/if}}" in template:\n{{if}}', 'Override onError() - with thrown syntax error (missing {{/if}})');

	// ................................ Act ..................................
	result = $.templates('{{if missing.object onError="myFallback"}}yes{{/if}}').render(app);

	// ............................... Assert .................................
	equal(result.slice(0,64), 'Override error - (Fallback string: myFallback) Rendering error: ', 'Override onError() - with {{if missing.object onError="myFallback"}}');

	// ................................ Reset ..................................
	$.views.settings({
		onError: oldOnError
	});
});

test("template encapsulation", 8, function() {
		// =============================== Arrange ===============================
$.templates({
		myTmpl6: {
			markup: "{{sort reverse=true people}}{{:name}}{{/sort}}",
			tags: {
				sort: sort
			}
		}
	});

	// ............................... Assert .................................
	equal($.render.myTmpl6({ people: people }), "BillJo", '$.templates("myTmpl", tmplObjWithNestedItems);');

	// =============================== Arrange ===============================
	$.views.helpers("h1", "globalHelper");

	var tmpl = $.templates({
		markup: "{{if true}}{{:~h1}} {{:~h2}} {{:~h3}}{{/if}}",
		helpers: {
			h2: "templateHelper"
		}
	});

	// ............................... Assert .................................
	equal(tmpl.render({}, {h3:"optionHelper"}), "globalHelper templateHelper optionHelper", 'Passing in helpers - global, template or option');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{if true}}{{:~h1}}{{/if}}",
		helpers: {
			h1: "templateHelper"
		}
	});

	// ............................... Assert .................................
	equal(tmpl.render({}), "templateHelper", 'template helper overrides global helper');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{if true}}{{:~h1}}{{/if}}"
	});

	// ............................... Assert .................................
	equal(tmpl.render({}, {h1: "optionHelper"}), "optionHelper", 'option helper overrides global helper');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{if true}}{{:~h2}}{{/if}}",
		helpers: {
			h2: "templateHelper"
		}
	});

	// ............................... Assert .................................
	equal(tmpl.render({}, {h2: "optionHelper"}), "templateHelper", 'template helper overrides option helper');

	// =============================== Arrange ===============================
	$.views.converters("c1", function(val) {return val + "globalCvt";});

	tmpl = $.templates({
		markup: "{{if true}}{{c1:1}}{{c2:2}}{{/if}}",
		converters: {
			c2: function(val) {return val + "templateCvt";}
		}
	});

	// ............................... Assert .................................
	equal(tmpl.render({}), "1globalCvt2templateCvt", 'template converter and global converter');

	// =============================== Arrange ===============================
	tmpl = $.templates({
		markup: "{{if true}}{{c1:1}}{{/if}}",
		converters: {
			c1: function(val) {return val + "templateCvt";}
		}
	});

	// ............................... Assert .................................
	equal(tmpl.render({}), "1templateCvt", 'template converter overrides global converter');

	// =============================== Arrange ===============================

	tmpl = $.templates({
		cascade: "outerCascade",
		nesting: {
			markup: "{{if true}} {{c1:~h1}} {{include tmpl='inner'/}}{{/if}} {{include tmpl='cascade'/}}",
			helpers: {
				h1: "templateHelper"
			},
			converters: {
				c1: function(val) {return val + " templateCvt";}
			},
			templates: {
				cascade: "innerCascade",
				inner: {
					markup: "{{if true}}{{c1:~h1}}{{/if}} {{include tmpl='cascade'/}}",
					helpers: {
						h1: "innerTemplateHelper"
					},
					converters: {
						c1: function(val) {return val + " innerTemplateCvt";}
					},
					templates: {
					cascade: "innerInnerCascade"
					}
				}
			}
		}
	});

	// ............................... Assert .................................
	equal($.templates.nesting.render({}, {b: "optionHelper"}), " templateHelper templateCvt innerTemplateHelper innerTemplateCvt innerInnerCascade innerCascade",
		'Inner template, helper, and converter override outer template, helper, and converter');

});

})();
})(this, this.jsviews);
