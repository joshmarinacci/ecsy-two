(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, (function () {
		var current = global.ECSYTwo;
		var exports = global.ECSYTwo = {};
		factory(exports);
		exports.noConflict = function () { global.ECSYTwo = current; return exports; };
	}()));
}(this, (function (exports) { 'use strict';

	/**
	 * @private
	 * @class EventDispatcher
	 */
	class EventDispatcher {
	  constructor() {
	    this._listeners = {};
	    this.stats = {
	      fired: 0,
	      handled: 0
	    };
	  }

	  /**
	   * Add an event listener
	   * @param {String} eventName Name of the event to listen
	   * @param {Function} listener Callback to trigger when the event is fired
	   */
	  addEventListener(eventName, listener) {
	    let listeners = this._listeners;
	    if (listeners[eventName] === undefined) {
	      listeners[eventName] = [];
	    }

	    if (listeners[eventName].indexOf(listener) === -1) {
	      listeners[eventName].push(listener);
	    }
	  }

	  /**
	   * Check if an event listener is already added to the list of listeners
	   * @param {String} eventName Name of the event to check
	   * @param {Function} listener Callback for the specified event
	   */
	  hasEventListener(eventName, listener) {
	    return (
	      this._listeners[eventName] !== undefined &&
	      this._listeners[eventName].indexOf(listener) !== -1
	    );
	  }

	  /**
	   * Remove an event listener
	   * @param {String} eventName Name of the event to remove
	   * @param {Function} listener Callback for the specified event
	   */
	  removeEventListener(eventName, listener) {
	    var listenerArray = this._listeners[eventName];
	    if (listenerArray !== undefined) {
	      var index = listenerArray.indexOf(listener);
	      if (index !== -1) {
	        listenerArray.splice(index, 1);
	      }
	    }
	  }

	  /**
	   * Dispatch an event
	   * @param {String} eventName Name of the event to dispatch
	   * @param {Entity} entity (Optional) Entity to emit
	   * @param {Component} component
	   */
	  dispatchEvent(eventName, entity, component) {
	    this.stats.fired++;

	    var listenerArray = this._listeners[eventName];
	    if (listenerArray !== undefined) {
	      var array = listenerArray.slice(0);

	      for (var i = 0; i < array.length; i++) {
	        array[i].call(this, entity, component);
	      }
	    }
	  }

	  /**
	   * Reset stats counters
	   */
	  resetCounters() {
	    this.stats.fired = this.stats.handled = 0;
	  }
	}

	/**
	 * Return the name of a component
	 * @param {Component} Component
	 * @private
	 */
	function getName(Component) {
	  return Component.name;
	}

	/**
	 * Get a key from a list of components
	 * @param {Array(Component)} Components Array of components to generate the key
	 * @private
	 */
	function queryKey(Components) {
	  var names = [];
	  for (var n = 0; n < Components.length; n++) {
	    var T = Components[n];
	    if (typeof T === "object") {
	      var operator = T.operator === "not" ? "!" : T.operator;
	      names.push(operator + getName(T.Component));
	    } else {
	      names.push(getName(T));
	    }
	  }

	  return names.sort().join("-");
	}

	class Query {
	  /**
	   * @param {Array(Component)} Components List of types of components to query
	   */
	  constructor(Components, manager) {
	    this.Components = [];
	    this.NotComponents = [];

	    Components.forEach(component => {
	      if (typeof component === "object") {
	        this.NotComponents.push(component.Component);
	      } else {
	        this.Components.push(component);
	      }
	    });

	    if (this.Components.length === 0) {
	      throw new Error("Can't create a query without components");
	    }

	    this.entities = [];

	    this.eventDispatcher = new EventDispatcher();

	    // This query is being used by a reactive system
	    this.reactive = false;

	    this.key = queryKey(Components);

	    // Fill the query with the existing entities
	    for (var i = 0; i < manager._entities.length; i++) {
	      var entity = manager._entities[i];
	      if (this.match(entity)) {
	        // @todo ??? this.addEntity(entity); => preventing the event to be generated
	        entity.queries.push(this);
	        this.entities.push(entity);
	      }
	    }
	  }

	  /**
	   * Add entity to this query
	   * @param {Entity} entity
	   */
	  addEntity(entity) {
	    entity.queries.push(this);
	    this.entities.push(entity);

	    this.eventDispatcher.dispatchEvent(Query.prototype.ENTITY_ADDED, entity);
	  }

	  /**
	   * Remove entity from this query
	   * @param {Entity} entity
	   */
	  removeEntity(entity) {
	    let index = this.entities.indexOf(entity);
	    if (~index) {
	      this.entities.splice(index, 1);

	      index = entity.queries.indexOf(this);
	      entity.queries.splice(index, 1);

	      this.eventDispatcher.dispatchEvent(
	        Query.prototype.ENTITY_REMOVED,
	        entity
	      );
	    }
	  }

	  match(entity) {
	    return (
	      entity.hasAllComponents(this.Components) &&
	      !entity.hasAnyComponents(this.NotComponents)
	    );
	  }

	  toJSON() {
	    return {
	      key: this.key,
	      reactive: this.reactive,
	      components: {
	        included: this.Components.map(C => C.name),
	        not: this.NotComponents.map(C => C.name)
	      },
	      numEntities: this.entities.length
	    };
	  }

	  /**
	   * Return stats for this query
	   */
	  stats() {
	    return {
	      numComponents: this.Components.length,
	      numEntities: this.entities.length
	    };
	  }
	}

	Query.prototype.ENTITY_ADDED = "Query#ENTITY_ADDED";
	Query.prototype.ENTITY_REMOVED = "Query#ENTITY_REMOVED";
	Query.prototype.COMPONENT_CHANGED = "Query#COMPONENT_CHANGED";

	class System {
	  canExecute() {
	    if (this._mandatoryQueries.length === 0) return true;

	    for (let i = 0; i < this._mandatoryQueries.length; i++) {
	      var query = this._mandatoryQueries[i];
	      if (query.entities.length === 0) {
	        return false;
	      }
	    }

	    return true;
	  }

	  constructor(world, attributes) {
	    this.world = world;
	    this.enabled = true;

	    // @todo Better naming :)
	    this._queries = {};
	    this.queries = {};

	    this.priority = 0;

	    // Used for stats
	    this.executeTime = 0;

	    if (attributes && attributes.priority) {
	      this.priority = attributes.priority;
	    }

	    this._mandatoryQueries = [];

	    this.initialized = true;

	    if (this.constructor.queries) {
	      for (var queryName in this.constructor.queries) {
	        var queryConfig = this.constructor.queries[queryName];
	        var Components = queryConfig.components;
	        if (!Components || Components.length === 0) {
	          throw new Error("'components' attribute can't be empty in a query");
	        }
	        var query = this.world.entityManager.queryComponents(Components);
	        this._queries[queryName] = query;
	        if (queryConfig.mandatory === true) {
	          this._mandatoryQueries.push(query);
	        }
	        this.queries[queryName] = {
	          results: query.entities
	        };

	        // Reactive configuration added/removed/changed
	        var validEvents = ["added", "removed", "changed"];

	        const eventMapping = {
	          added: Query.prototype.ENTITY_ADDED,
	          removed: Query.prototype.ENTITY_REMOVED,
	          changed: Query.prototype.COMPONENT_CHANGED // Query.prototype.ENTITY_CHANGED
	        };

	        if (queryConfig.listen) {
	          validEvents.forEach(eventName => {
	            // Is the event enabled on this system's query?
	            if (queryConfig.listen[eventName]) {
	              let event = queryConfig.listen[eventName];

	              if (eventName === "changed") {
	                query.reactive = true;
	                if (event === true) {
	                  // Any change on the entity from the components in the query
	                  let eventList = (this.queries[queryName][eventName] = []);
	                  query.eventDispatcher.addEventListener(
	                    Query.prototype.COMPONENT_CHANGED,
	                    entity => {
	                      // Avoid duplicates
	                      if (eventList.indexOf(entity) === -1) {
	                        eventList.push(entity);
	                      }
	                    }
	                  );
	                } else if (Array.isArray(event)) {
	                  let eventList = (this.queries[queryName][eventName] = []);
	                  query.eventDispatcher.addEventListener(
	                    Query.prototype.COMPONENT_CHANGED,
	                    (entity, changedComponent) => {
	                      // Avoid duplicates
	                      if (
	                        event.indexOf(changedComponent.constructor) !== -1 &&
	                        eventList.indexOf(entity) === -1
	                      ) {
	                        eventList.push(entity);
	                      }
	                    }
	                  );
	                }
	              } else {
	                let eventList = (this.queries[queryName][eventName] = []);

	                query.eventDispatcher.addEventListener(
	                  eventMapping[eventName],
	                  entity => {
	                    // @fixme overhead?
	                    if (eventList.indexOf(entity) === -1)
	                      eventList.push(entity);
	                  }
	                );
	              }
	            }
	          });
	        }
	      }
	    }
	  }

	  stop() {
	    this.executeTime = 0;
	    this.enabled = false;
	  }

	  play() {
	    this.enabled = true;
	  }

	  // @question rename to clear queues?
	  clearEvents() {
	    for (let queryName in this.queries) {
	      var query = this.queries[queryName];
	      if (query.added) {
	        query.added.length = 0;
	      }
	      if (query.removed) {
	        query.removed.length = 0;
	      }
	      if (query.changed) {
	        if (Array.isArray(query.changed)) {
	          query.changed.length = 0;
	        } else {
	          for (let name in query.changed) {
	            query.changed[name].length = 0;
	          }
	        }
	      }
	    }
	  }

	  toJSON() {
	    var json = {
	      name: this.constructor.name,
	      enabled: this.enabled,
	      executeTime: this.executeTime,
	      priority: this.priority,
	      queries: {}
	    };

	    if (this.constructor.queries) {
	      var queries = this.constructor.queries;
	      for (let queryName in queries) {
	        let query = this.queries[queryName];
	        let queryDefinition = queries[queryName];
	        let jsonQuery = (json.queries[queryName] = {
	          key: this._queries[queryName].key
	        });

	        jsonQuery.mandatory = queryDefinition.mandatory === true;
	        jsonQuery.reactive =
	          queryDefinition.listen &&
	          (queryDefinition.listen.added === true ||
	            queryDefinition.listen.removed === true ||
	            queryDefinition.listen.changed === true ||
	            Array.isArray(queryDefinition.listen.changed));

	        if (jsonQuery.reactive) {
	          jsonQuery.listen = {};

	          const methods = ["added", "removed", "changed"];
	          methods.forEach(method => {
	            if (query[method]) {
	              jsonQuery.listen[method] = {
	                entities: query[method].length
	              };
	            }
	          });
	        }
	      }
	    }

	    return json;
	  }
	}

	class Component {}

	Component.isComponent = true;

	function createType(typeDefinition) {
	  var mandatoryFunctions = [
	    "create",
	    "reset",
	    "clear"
	    /*"copy"*/
	  ];

	  var undefinedFunctions = mandatoryFunctions.filter(f => {
	    return !typeDefinition[f];
	  });

	  if (undefinedFunctions.length > 0) {
	    throw new Error(
	      `createType expect type definition to implements the following functions: ${undefinedFunctions.join(
        ", "
      )}`
	    );
	  }

	  typeDefinition.isType = true;
	  return typeDefinition;
	}

	/**
	 * Standard types
	 */
	var Types = {};

	Types.Number = createType({
	  baseType: Number,
	  isSimpleType: true,
	  create: defaultValue => {
	    return typeof defaultValue !== "undefined" ? defaultValue : 0;
	  },
	  reset: (src, key, defaultValue) => {
	    if (typeof defaultValue !== "undefined") {
	      src[key] = defaultValue;
	    } else {
	      src[key] = 0;
	    }
	  },
	  clear: (src, key) => {
	    src[key] = 0;
	  }
	});

	Types.Boolean = createType({
	  baseType: Boolean,
	  isSimpleType: true,
	  create: defaultValue => {
	    return typeof defaultValue !== "undefined" ? defaultValue : false;
	  },
	  reset: (src, key, defaultValue) => {
	    if (typeof defaultValue !== "undefined") {
	      src[key] = defaultValue;
	    } else {
	      src[key] = false;
	    }
	  },
	  clear: (src, key) => {
	    src[key] = false;
	  }
	});

	Types.String = createType({
	  baseType: String,
	  isSimpleType: true,
	  create: defaultValue => {
	    return typeof defaultValue !== "undefined" ? defaultValue : "";
	  },
	  reset: (src, key, defaultValue) => {
	    if (typeof defaultValue !== "undefined") {
	      src[key] = defaultValue;
	    } else {
	      src[key] = "";
	    }
	  },
	  clear: (src, key) => {
	    src[key] = "";
	  }
	});

	Types.Array = createType({
	  baseType: Array,
	  create: defaultValue => {
	    if (typeof defaultValue !== "undefined") {
	      return defaultValue.slice();
	    }

	    return [];
	  },
	  reset: (src, key, defaultValue) => {
	    if (typeof defaultValue !== "undefined") {
	      src[key] = defaultValue.slice();
	    } else {
	      src[key].length = 0;
	    }
	  },
	  clear: (src, key) => {
	    src[key].length = 0;
	  },
	  copy: (src, dst, key) => {
	    src[key] = dst[key].slice();
	  }
	});

	function generateId(length) {
	  var result = "";
	  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	  var charactersLength = characters.length;
	  for (var i = 0; i < length; i++) {
	    result += characters.charAt(Math.floor(Math.random() * charactersLength));
	  }
	  return result;
	}

	function injectScript(src, onLoad) {
	  var script = document.createElement("script");
	  // @todo Use link to the ecsy-devtools repo?
	  script.src = src;
	  script.onload = onLoad;
	  (document.head || document.documentElement).appendChild(script);
	}

	/* global Peer */

	function hookConsoleAndErrors(connection) {
	  var wrapFunctions = ["error", "warning", "log"];
	  wrapFunctions.forEach(key => {
	    if (typeof console[key] === "function") {
	      var fn = console[key].bind(console);
	      console[key] = (...args) => {
	        connection.send({
	          method: "console",
	          type: key,
	          args: JSON.stringify(args)
	        });
	        return fn.apply(null, args);
	      };
	    }
	  });

	  window.addEventListener("error", error => {
	    connection.send({
	      method: "error",
	      error: JSON.stringify({
	        message: error.error.message,
	        stack: error.error.stack
	      })
	    });
	  });
	}

	function includeRemoteIdHTML(remoteId) {
	  let infoDiv = document.createElement("div");
	  infoDiv.style.cssText = `
    align-items: center;
    background-color: #333;
    color: #aaa;
    display:flex;
    font-family: Arial;
    font-size: 1.1em;
    height: 40px;
    justify-content: center;
    left: 0;
    opacity: 0.9;
    position: absolute;
    right: 0;
    text-align: center;
    top: 0;
  `;

	  infoDiv.innerHTML = `Open ECSY devtools to connect to this page using the code:&nbsp;<b style="color: #fff">${remoteId}</b>&nbsp;<button onClick="generateNewCode()">Generate new code</button>`;
	  document.body.appendChild(infoDiv);

	  return infoDiv;
	}

	function enableRemoteDevtools(remoteId) {
	  window.generateNewCode = () => {
	    window.localStorage.clear();
	    remoteId = generateId(6);
	    window.localStorage.setItem("ecsyRemoteId", remoteId);
	    window.location.reload(false);
	  };

	  remoteId = remoteId || window.localStorage.getItem("ecsyRemoteId");
	  if (!remoteId) {
	    remoteId = generateId(6);
	    window.localStorage.setItem("ecsyRemoteId", remoteId);
	  }

	  let infoDiv = includeRemoteIdHTML(remoteId);

	  window.__ECSY_REMOTE_DEVTOOLS_INJECTED = true;
	  window.__ECSY_REMOTE_DEVTOOLS = {};

	  let Version = "";

	  // This is used to collect the worlds created before the communication is being established
	  let worldsBeforeLoading = [];
	  let onWorldCreated = e => {
	    var world = e.detail.world;
	    Version = e.detail.version;
	    worldsBeforeLoading.push(world);
	  };
	  window.addEventListener("ecsy-world-created", onWorldCreated);

	  let onLoaded = () => {
	    var peer = new Peer(remoteId);
	    peer.on("open", (/* id */) => {
	      peer.on("connection", connection => {
	        window.__ECSY_REMOTE_DEVTOOLS.connection = connection;
	        connection.on("open", function() {
	          // infoDiv.style.visibility = "hidden";
	          infoDiv.innerHTML = "Connected";

	          // Receive messages
	          connection.on("data", function(data) {
	            if (data.type === "init") {
	              var script = document.createElement("script");
	              script.setAttribute("type", "text/javascript");
	              script.onload = () => {
	                script.parentNode.removeChild(script);

	                // Once the script is injected we don't need to listen
	                window.removeEventListener(
	                  "ecsy-world-created",
	                  onWorldCreated
	                );
	                worldsBeforeLoading.forEach(world => {
	                  var event = new CustomEvent("ecsy-world-created", {
	                    detail: { world: world, version: Version }
	                  });
	                  window.dispatchEvent(event);
	                });
	              };
	              script.innerHTML = data.script;
	              (document.head || document.documentElement).appendChild(script);
	              script.onload();

	              hookConsoleAndErrors(connection);
	            } else if (data.type === "executeScript") {
	              let value = eval(data.script);
	              if (data.returnEval) {
	                connection.send({
	                  method: "evalReturn",
	                  value: value
	                });
	              }
	            }
	          });
	        });
	      });
	    });
	  };

	  // Inject PeerJS script
	  injectScript(
	    "https://cdn.jsdelivr.net/npm/peerjs@0.3.20/dist/peer.min.js",
	    onLoaded
	  );
	}

	const urlParams = new URLSearchParams(window.location.search);

	// @todo Provide a way to disable it if needed
	if (urlParams.has("enable-remote-devtools")) {
	  enableRemoteDevtools();
	}

	class Canvas extends Component {
	    constructor() {
	        super();
	        this.scale = 1;
	        this.dom = null;
	        this.pixelMode = false;
	        this.width = 100;
	        this.height = 100;
	    }
	}

	class BackgroundFill extends Component {
	    constructor() {
	        super();
	        this.color = 'white';
	    }
	}

	class Camera extends Component {
	    constructor() {
	        super();
	        this.x = 0;
	        this.y = 0;
	        this.centered = true;
	    }
	}
	class CameraFollowsSprite extends Component {
	    constructor() {
	        super();
	        this.target = null;
	    }
	}


	class Sprite extends  Component {
	    constructor() {
	        super();
	        this.x = 0;
	        this.y = 0;
	        this.width = 10;
	        this.height = 10;
	        this.layer = "default";
	        this.draw_object = null;
	    }
	    left() {
	        return this.x
	    }
	    right() {
	        return this.x + this.width
	    }
	    top() {
	        return this.y
	    }
	    bottom() {
	        return this.y + this.height
	    }
	    intersects(r2) {
	        return this.right() >= r2.left() && this.left() <= r2.right() &&
	            this.top() <= r2.bottom() && this.bottom() >= r2.top();
	    }
	    union(r2) {
	        let sprite = new Sprite();
	        let r1 = this;
	        sprite.x = Math.min(r1.x, r2.x);
	        sprite.y = Math.min(r1.y, r2.y);
	        sprite.width  = Math.max( r1.right(),  r2.right() )  - Math.min( r1.left(), r2.left() );
	        sprite.height = Math.max( r1.bottom(), r2.bottom() ) - Math.min( r1.top(),  r2.top() );
	        return sprite
	    }
	}
	class DebugOutline {
	    constructor() {
	        this.color = 'red';
	    }
	}
	class FilledSprite extends Component {
	    constructor() {
	        super();
	        this.color = 'red';
	    }
	}

	class ECSYTwoSystem extends  System {
	    execute(delta, time) {
	        this.queries.canvas.added.forEach(ent => {
	            let canvas = ent.getMutableComponent(Canvas);
	            canvas.dom = document.createElement('canvas');
	            canvas.dom.width = canvas.width*canvas.scale;
	            canvas.dom.height = canvas.height*canvas.scale;
	            document.body.append(canvas.dom);
	        });
	        this.queries.canvas.results.forEach(ent => {
	            let canvas = ent.getComponent(Canvas);
	            let ctx = canvas.dom.getContext('2d');
	            ctx.imageSmoothingEnabled = !canvas.pixelMode;
	            ctx.save();
	            ctx.scale(canvas.scale,canvas.scale);
	            this.queries.background.results.forEach(ent => {
	                let bg = ent.getComponent(BackgroundFill);
	                ctx.fillStyle = bg.color;
	                ctx.fillRect(0,0,canvas.dom.width,canvas.dom.height);
	            });
	            ctx.restore();
	        });
	    }
	}
	ECSYTwoSystem.queries = {
	    canvas: {
	        components: [Canvas],
	        listen: {
	            added:true,
	        }
	    },
	    background: {
	        components: [BackgroundFill]
	    }
	};

	function startWorld(world) {
	    let lastTime = performance.now();
	    function run() {
	        const time = performance.now();
	        const delta = time - lastTime;

	        // Run all the systems
	        world.execute(delta, time);

	        lastTime = time;
	        requestAnimationFrame(run);
	    }
	    run();
	}

	class InputState extends Component {
	    constructor() {
	        super();
	        this.states = {};
	        this.changed = true;
	        this.released = false;
	    }

	    anyChanged() {
	        return this.changed
	    }

	    anyReleased() {
	        return this.released
	    }
	}

	class Layer extends Component{
	    constructor() {
	        super();
	        this.name = "unnamed-layer";
	        this.depth = 100000;
	    }
	}
	class LayerParent extends Component {
	    constructor() {
	        super();
	        this.name = "default";
	        this.draw_object = null;
	    }
	}


	class LayerRenderingSystem extends System {
	    init() {
	        this.layer_order = [];
	        this.layer_index = {};
	    }
	    execute(delta, time) {
	        //this creates a default layer for anything that doesn't specify a layer
	        this.queries.canvas.added.forEach(ent => {
	            ent.addComponent(Layer, { name:'default', depth: 0});
	        });
	        this.update_layer_order();
	        this.update_layer_index();
	        this.draw_layers();
	    }

	    update_layer_order() {
	        this.layer_order = this.queries.layers.results.map(ent => ent.getComponent(Layer));
	        this.layer_order.sort((a,b)=> a.depth - b.depth);
	    }

	    update_layer_index() {
	        this.layer_index = {};
	        this.queries.layer_children.results.forEach(ent => {
	            let ch = ent.getComponent(LayerParent);
	            if(!this.layer_index[ch.name]) this.layer_index[ch.name] = [];
	            if(ch.draw_object) this.layer_index[ch.name].push(ch.draw_object);
	        });
	        this.queries.sprite_children.results.forEach(ent => {
	            let ch = ent.getComponent(Sprite);
	            if(!this.layer_index[ch.layer]) this.layer_index[ch.layer] = [];
	            if(ch.draw_object) this.layer_index[ch.layer].push(ch.draw_object);
	        });
	    }

	    draw_layers() {
	        this.queries.canvas.results.forEach(canvas_ent => {
	            let canvas = canvas_ent.getComponent(Canvas);
	            let ctx = canvas.dom.getContext('2d');
	            ctx.save();
	            ctx.scale(canvas.scale,canvas.scale);
	            if(canvas_ent.hasComponent(Camera)) {
	                let camera = canvas_ent.getComponent(Camera);
	                if (camera.centered) {
	                    ctx.translate(
	                        -camera.x + canvas.width / 2,
	                        -camera.y + canvas.height / 2);
	                }
	            }
	            this.layer_order.forEach(layer => {
	                let children = this.layer_index[layer.name];
	                if(children) children.forEach(ch => ch.draw(ctx, canvas_ent));
	            });
	            ctx.restore();
	        });
	    }
	}
	LayerRenderingSystem.queries = {
	    canvas: {
	        components: [Canvas],
	        listen: {
	            added:true
	        }
	    },
	    layers: {
	        components:[Layer]
	    },
	    layer_children: {
	        components: [LayerParent]
	    },
	    sprite_children: {
	        components: [Sprite]
	    },
	};


	class DrawFilledRect {
	    constructor(bounds,color) {
	        this.bounds = bounds;
	        this.color = color;
	    }
	    draw(ctx) {
	        ctx.fillStyle = this.color;
	        ctx.fillRect(this.bounds.x,this.bounds.y,this.bounds.width,this.bounds.height);
	    }
	}

	class DrawStrokedRect {
	    constructor(bounds,color) {
	        this.bounds = bounds;
	        this.color = color;
	    }
	    draw(ctx) {
	        ctx.strokeStyle = this.color;
	        ctx.strokeRect(this.bounds.x,this.bounds.y,this.bounds.width,this.bounds.height);
	    }
	}

	class DrawImage {
	    constructor(bounds, image_sprite) {
	        this.bounds = bounds;
	        this.sprite = image_sprite;
	    }
	    draw(ctx, ent) {
	        if(this.sprite && this.sprite.image) {
	            ctx.save();
	            if(this.sprite.flipY) {
	                ctx.scale(-1,1);
	                ctx.translate(-this.sprite.width,0);
	            }
	            if(this.bounds.fixed && ent.hasComponent(Camera)) {
	                let canvas = ent.getComponent(Canvas);
	                let camera = ent.getComponent(Camera);
	                ctx.translate(
	                    +camera.x - canvas.width/2,
	                    +camera.y - canvas.height/2);
	            }
	            ctx.translate(this.bounds.x,this.bounds.y);
	            ctx.drawImage(this.sprite.image, 0, 0);
	            ctx.restore();
	        }

	    }
	}

	class ImageSprite extends Component {
	    constructor() {
	        super();
	        this.image = null;
	        this.src = null;
	    }
	}

	class AnimatedSprite extends Component {
	    constructor() {
	        super();
	        this.image = null;
	        this.frame_count = 1;
	        this.current_frame = 0;
	        this.width = -1;
	        this.height = -1;
	        this.frame_duration = 250;
	        this.last_frame_time = 0;
	        this.src = null;
	        this.frame_width = 16;
	    }
	}
	class SpriteSystem extends System {
	    execute(delta, time) {
	        this.queries.canvas.results.forEach(canvas_ent => {
	            let canvas = canvas_ent.getComponent(Canvas);
	            let ctx = canvas.dom.getContext('2d');
	            ctx.imageSmoothingEnabled = false;
	            ctx.save();
	            ctx.scale(canvas.scale,canvas.scale);
	            if(canvas_ent.hasComponent(Camera)) {
	                let camera = canvas_ent.getComponent(Camera);
	                if (camera.centered) {
	                    ctx.translate(
	                        -camera.x + canvas.width / 2,
	                        -camera.y + canvas.height / 2);
	                }
	            }

	            //load sprites with src properties
	            this.queries.sprites.added.forEach(ent =>{
	                let sprite = ent.getComponent(ImageSprite);
	                if(!sprite.image && sprite.src) {
	                    sprite.image = new Image();
	                    sprite.image.src = sprite.src;
	                }
	            });
	            // load animated sprites with src properties
	            this.queries.animated_sprites.added.forEach(ent =>{
	                let sprite = ent.getComponent(AnimatedSprite);
	                if(!sprite.frames && sprite.src) {
	                    sprite.image = new Image();
	                    sprite.image.src = sprite.src;
	                }
	            });

	            // draw colored sprites
	            this.queries.filled_sprites.results.forEach(ent => {
	                let sprite = ent.getComponent(Sprite);
	                let color = ent.getComponent(FilledSprite);
	                sprite.draw_object = new DrawFilledRect(sprite,color.color);
	            });
	            // draw image sprites
	            this.queries.sprites.results.forEach(ent => {
	                let sprite = ent.getComponent(Sprite);
	                /*
	                if(sprite.fixed && canvas_ent.hasComponent(Camera)) {
	                    let camera = canvas_ent.getComponent(Camera)
	                    ctx.translate(
	                        +camera.x - canvas.width/2,
	                        +camera.y - canvas.height/2)
	                }
	                 */
	                let image_sprite = ent.getComponent(ImageSprite);
	                sprite.draw_object = new DrawImage(sprite,image_sprite);
	            });

	            // draw animated images sprites
	            this.queries.animated_sprites.results.forEach(ent => {
	                let sprite = ent.getMutableComponent(AnimatedSprite);
	                let diff = time - sprite.last_frame_time;
	                if(diff > sprite.frame_duration) {
	                    sprite.current_frame = (sprite.current_frame + 1) % sprite.frame_count;
	                    sprite.last_frame_time = time;
	                }
	                let loc = ent.getComponent(Sprite);
	                ctx.save();
	                ctx.translate(loc.x, loc.y);
	                if(sprite.flipY) {
	                    ctx.scale(-1,1);
	                    ctx.translate(-sprite.width,0);
	                }
	                ctx.drawImage(sprite.image,
	                    sprite.width*sprite.current_frame,0,sprite.width, sprite.height,
	                    0,0,sprite.width, sprite.height
	                );
	                ctx.restore();
	            });

	            //draw debug sprites
	            this.queries.debug_sprites.results.forEach(ent => {
	                let sprite = ent.getComponent(Sprite);
	                let debug = ent.getComponent(DebugOutline);
	                sprite.draw_object = new DrawStrokedRect(sprite,debug.color);
	                ctx.strokeStyle = debug.color;
	                ctx.strokeRect(sprite.x, sprite.y, sprite.width, sprite.height);
	            });
	            ctx.restore();
	        });

	        this.queries.camera_move.results.forEach(ent => {
	            let cfs = ent.getComponent(CameraFollowsSprite);
	            if(!cfs.target) return
	            let loc = cfs.target.getComponent(Sprite);
	            if(!loc) return
	            this.queries.canvas.results.forEach(ent => {
	                if(ent.hasComponent(Camera)) {
	                    let camera = ent.getMutableComponent(Camera);
	                    camera.x = loc.x;
	                    camera.y = loc.y;
	                }
	            });
	        });
	    }
	}

	SpriteSystem.queries = {
	    canvas: {
	        components: [Canvas],
	    },
	    sprites: {
	        components: [Sprite, ImageSprite],
	        listen: {
	            added:true,
	            removed:true,
	        }
	    },
	    camera_move: {
	        components: [CameraFollowsSprite]
	    },
	    animated_sprites: {
	        components: [Sprite, AnimatedSprite],
	        listen: {
	            added:true,
	            removed:true,
	        }
	    },
	    filled_sprites: {
	        components: [Sprite, FilledSprite]
	    },
	    debug_sprites: {
	        components: [Sprite, DebugOutline]
	    }
	};


	class SpriteSheet {
	    constructor(img,tw,th) {
	        this.image = img;
	        this.tw = tw;
	        this.th = th;
	    }

	    sprite_to_image(x, y) {
	        let canvas = document.createElement('canvas');
	        canvas.width = this.tw;
	        canvas.height = this.th;
	        let ctx = canvas.getContext('2d');
	        ctx.drawImage(this.image,
	            x*this.tw,
	            y*this.th,
	            this.tw,
	            this.th,
	            0,0,this.tw,this.th);
	        return canvas
	    }

	    sprites_to_frames(x, y, w) {
	        let arr = [];
	        for(let i=0; i<w; i++) {
	            arr.push(this.sprite_to_image(x+i,y));
	        }
	        return arr
	    }

	    drawSpriteAt(ctx, tx, ty, cx, cy) {
	        ctx.drawImage(this.image,
	            tx*this.tw, ty*this.th, this.tw,this.th, // source x,y,w,h
	            cx, cy, this.tw, this.th, // dest x,y,w,h
	        );

	    }
	}
	function load_image_from_url(src) {
	    return new Promise((res,rej)=>{
	        let img = document.createElement('img');
	        img.onload = ()=>  {
	            console.log("Image Loaded ",src);
	            res(img);
	        };
	        img.onerror =() => rej(img);
	        img.src = src;
	    })
	}

	class KeyboardState extends Component {
	    constructor() {
	        super();
	        this.states = {};
	        this.mapping = {
	            ' ':'jump',
	            'ArrowLeft':'left',
	            'ArrowRight':'right',
	            'ArrowUp':'up',
	            'ArrowDown':'down',
	        };
	        this.on_keydown = (e) => {
	            this.setKeyState(e.key,'down');
	        };
	        this.on_keyup = (e) => {
	            this.setKeyState(e.key,'up');
	        };
	    }
	    setKeyState(key,value) {
	        let state = this.getKeyState(key);
	        state.prev = state.current;
	        state.current = value;
	    }
	    getKeyState(key) {
	        if(!this.states[key]) {
	            this.states[key] = {
	                prev:'up',
	                current:'up',
	            };
	        }
	        return this.states[key]
	    }
	    isPressed(name) {
	        return this.getKeyState(name).current === 'down'
	    }
	}
	class KeyboardSystem extends System {
	    execute(delta, time) {
	        this.queries.controls.added.forEach( ent => {
	            let cont = ent.getMutableComponent(KeyboardState);
	            document.addEventListener('keydown',cont.on_keydown);
	            document.addEventListener('keyup',cont.on_keyup);
	        });
	        this.queries.controls.results.forEach(ent => {
	            let kb = ent.getComponent(KeyboardState);
	            let inp = ent.getMutableComponent(InputState);
	            inp.changed = false;
	            inp.released = false;
	            Object.keys(kb.mapping).forEach(key => {
	                let name = kb.mapping[key];
	                let state = kb.getKeyState(key);
	                if(state.current === 'down' && state.prev === 'up') {
	                    inp.states[name] = (state.current === 'down');
	                    inp.changed = true;
	                }
	                if(state.current === 'up' && state.prev === 'down') {
	                    inp.states[name] = (state.current === 'down');
	                    inp.changed = true;
	                    inp.released = true;
	                }
	                state.prev = state.current;
	            });
	            // console.log("key mapping", kb.mapping['a'], kb.states['a'], "left state",inp.states['left'])
	        });
	    }
	}
	KeyboardSystem.queries = {
	    controls: {
	        components:[KeyboardState, InputState],
	        listen: { added:true, removed: true},
	    },
	};

	class MouseState {
	    constructor() {
	        this.clientX = 0;
	        this.clientY = 0;
	    }
	}
	class MouseInputSystem extends System {
	    execute(delta, time) {
	        this.queries.mouse.added.forEach(ent => {
	            let mouse = ent.getMutableComponent(MouseState);
	            mouse.moveHandler = (e) =>  {
	                mouse.clientX = e.clientX;
	                mouse.lastTimestamp = e.timeStamp;
	            };
	            document.addEventListener('mousemove', mouse.moveHandler, false);
	        });
	        this.queries.mouse.results.forEach(ent => {
	            // console.log("current mouse",ent.getComponent(MouseState))
	        });
	        this.queries.mouse.removed.forEach(ent => {
	            let mouse = ent.getMutableComponent(MouseState);
	            document.removeEventListener('mousemove', mouse.moveHandler);
	        });
	    }
	}
	MouseInputSystem.queries = {
	    mouse: {
	        components:[MouseState],
	        listen: {
	            added:true,
	            removed:true
	        }
	    }
	};

	function make_point(tx, ty) {
	    return {
	        x: tx,
	        y: ty
	    }
	}

	class FullscreenMode extends Component {
	}

	class FullscreenButton extends Component {
	}

	class FullscreenSystem extends  System {
	    execute(delta, time) {
	        this.queries.buttons.added.forEach(ent => {
	            let elem = document.createElement('button');
	            elem.innerText = "fullscreen";
	            elem.classList.add("fullscreen");
	            elem.addEventListener('click',(e)=>{
	                e.stopPropagation();
	                e.preventDefault();
	                ent.addComponent(FullscreenMode);
	            });
	            document.documentElement.append(elem);
	        });
	        this.queries.active.added.forEach(ent => {
	            console.log("turned on full screen");
	            let mode = ent.getMutableComponent(FullscreenMode);
	            mode.fullscreenchangeHandler = () => {
	                console.log("entered full screen");
	                if(document.fullscreenElement || document.webkitFullscreenElement) {
	                    console.log("entered");
	                } else {
	                    console.log("exited");
	                    ent.removeComponent(FullscreenMode);
	                }
	            };
	            document.addEventListener('fullscreenchange',mode.fullscreenchangeHandler);
	            document.addEventListener('webkitfullscreenchange',mode.fullscreenchangeHandler);
	            const domElement = document.querySelector("canvas");
	            domElement.requestFullscreen();
	        });
	        this.queries.active.removed.forEach(ent => {
	            console.log("removed the fullscreen mode");
	        });
	    }
	}
	FullscreenSystem.queries = {
	    buttons: {
	        components: [FullscreenButton],
	        listen: {
	            added:true
	        }
	    },
	    active: {
	        components: [FullscreenMode],
	        listen: {
	            added:true,
	            removed:true,
	        }
	    }
	};

	class SoundEffect {
	    constructor() {
	        this.audio = null;
	        this.src = null;
	    }
	}
	class PlaySoundEffect {

	}
	class AudioSystem extends System {
	    execute(delta, time) {
	        this.queries.sound_effects.added.forEach(ent => {
	            let effect = ent.getComponent(SoundEffect);
	            if(effect.src && !this.audio) {
	                effect.audio = new Audio();
	                console.log("loading the audio",effect.src);
	                effect.audio.addEventListener('loadeddata', () => {
	                    console.log("loaded audio from src",effect.src);
	                });
	                effect.audio.src = effect.src;
	            }
	        });
	        this.queries.play.added.forEach(ent => {
	            let sound = ent.getComponent(SoundEffect);
	            sound.audio.play();
	            ent.removeComponent(PlaySoundEffect);
	        });
	    }
	}
	AudioSystem.queries = {
	    sound_effects: {
	        components:[SoundEffect],
	        listen: {
	            added:true,
	        }
	    },
	    play: {
	        components:[SoundEffect, PlaySoundEffect],
	        listen: {
	            added:true,
	        }
	    }
	};

	const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
	const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
	const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;
	function is_flipped_horizontally(index) {
	    return ((index & FLIPPED_HORIZONTALLY_FLAG) !== 0)
	}


	class TileMap extends Component {
	    constructor() {
	        super();
	        this.tileSize = 16;
	        this.width = -1;
	        this.height = -1;
	        this.layers = [];
	        this.index = [];
	        this.wall_types = [];
	    }
	    tile_at(name, canvas_coords) {
	        let layer = this.layer_by_name(name);
	        let tile_coords = make_point(
	            Math.floor(canvas_coords.x / this.tileSize ),
	            Math.floor(canvas_coords.y / this.tileSize ),
	        );
	        if(layer && layer.type === 'tilelayer') return layer.data[tile_coords.y*this.width+tile_coords.x]
	        return null
	    }
	    set_tile_at(layerIndex,coords,v) {
	        return this.layer_by_name(layerIndex).data[coords.y*this.width+coords.x] = v
	    }

	    layer_by_name(name) {
	        return this.layers.find(layer=>layer.name === name)
	    }
	}

	class TileMapSystem extends System {
	    execute(delta, time) {
	        this.queries.maps.results.forEach(ent => {
	            let map = ent.getComponent(TileMap);
	            let layer = ent.getComponent(LayerParent);
	            layer.draw_object = {
	                draw:(ctx)=>{
	                    this.drawMap(map,ctx);
	                }
	            };
	        });
	    }

	    drawMap(map,ctx) {
	        map.layers.forEach(layer => {
	            if (layer.type === 'tilelayer') this.drawTileLayer(map, ctx, layer);
	            if (layer.type === 'objectgroup') this.drawObjectLayer(map, ctx, layer);
	        });
	    }

	    drawTileLayer(map, ctx, layer) {
	        for(let y=0; y<layer.height; y++) {
	            for(let x=0; x<layer.width; x++) {
	                let n = y*layer.width+x;
	                let tile_index_raw = layer.data[n];
	                let tile_index = (tile_index_raw & (~ (FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG)));
	                if (tile_index === 0) continue
	                let tile = map.index[tile_index];
	                if(!tile) console.error("missing tile " + tile_index + " " + tile);
	                // if(!tile && tile_index < 1000) continue
	                if(!tile) throw new Error("missing tile " + tile_index + " " + tile)
	                if(tile)  {
	                    ctx.save();
	                    ctx.translate(x * map.tilewidth, y * map.tileheight);
	                    if(is_flipped_horizontally(tile_index_raw)) {
	                        ctx.scale(-1.0,1.0);
	                        ctx.translate(-map.tilewidth,0);
	                    }
	                    ctx.drawImage(tile, 0,0);
	                    ctx.restore();
	                }
	            }
	        }
	    }

	    drawObjectLayer(map, ctx, layer) {
	        layer.objects.forEach(obj => {
	            if(obj.gid) {
	                let tile = map.index[obj.gid];
	                if(!tile) throw new Error("missing tile " + obj.gid + " " + tile)
	                if(tile)  ctx.drawImage(tile,obj.x, obj.y-obj.height);
	            }
	        });
	    }
	}

	TileMapSystem.queries = {
	    screen: {
	        components:[Canvas, Camera]
	    },
	    maps: {
	        components:[TileMap, LayerParent],
	    }
	};

	function load_tilemap_from_url(source) {
	    let url = new URL(source, document.baseURI);
	    console.log("loading tilemap from ",url);
	    return fetch(url).then(res=>res.json()).then(data => {
	        let tile_index = [];
	        let blocking = [];
	        data.source = source;
	        return Promise.all(data.tilesets.map(tileset => {
	            if(!tileset.image) {
	                let msg = "tileset doesn't have an image. are you sure it's embedded";
	                console.error(msg);
	                return
	                // throw new Error(msg)
	            }
	            let imgurl = new URL(tileset.image, url);
	            return load_image_from_url(imgurl).then(img => {
	                let sheet = new SpriteSheet(img, tileset.tilewidth, tileset.tileheight);
	                let start = tileset.firstgid;
	                for (let i = 0; i < tileset.tilecount; i++) {
	                    tile_index[start] = sheet.sprite_to_image(
	                        i % tileset.columns,
	                        Math.floor(i / tileset.columns));
	                    start++;
	                }
	                if (tileset.tiles) {
	                    tileset.tiles.forEach(tile => {
	                        if (tile.type === 'floor') blocking.push(tile.id + tileset.firstgid);
	                        if (tile.type === 'wall') blocking.push(tile.id  + tileset.firstgid);
	                        if (tile.type === 'block') blocking.push(tile.id  + tileset.firstgid);
	                    });
	                }
	            })
	        })).then(()=>{
	            data.index = tile_index;
	            console.log("blocking is",blocking);
	            data.wall_types = blocking;
	            return data
	        })
	    })
	}

	// export function load_tilemap(url,sheet) {
	//     return fetch(url).then(res => res.json()).then(data => {
	//         console.log("loaded tilemap: ",url)
	//         console.log("data is ", data)
	//         let ts = data.tilesets[0]
	//         let TILE_MAP = {
	//             width: data.width,
	//             height: data.height,
	//             data: data.layers[0].data
	//         }
	//
	//         let TILE_INDEX = []
	//         let start = ts.firstgid
	//         for (let i = 0; i < ts.tilecount; i++) {
	//             TILE_INDEX[start] = sheet.sprite_to_image(i % 8, Math.floor(i / 8))
	//             start++
	//         }
	//         let blocking = []
	//         if(ts.tiles) {
	//             ts.tiles.forEach(tile => {
	//                 if (tile.type === 'floor') blocking.push(tile.id + 1)
	//                 if (tile.type === 'wall') blocking.push(tile.id + 1)
	//                 if (tile.type === 'block') blocking.push(tile.id + 1)
	//             })
	//         }
	//
	//         // blocking = [2]
	//         // console.log("blocking numbers are", blocking)
	//         return {
	//             name: url,
	//             tileSize: ts.tilewidth,
	//             width: TILE_MAP.width,
	//             height: TILE_MAP.height,
	//             map: TILE_MAP.data,
	//             index: TILE_INDEX,
	//             wall_types: blocking,
	//         }
	//     })
	// }

	/*

	disable platformer physics
	show splash image
	wait for any button press
	fade to black
	load and setup tilemap
	fade from black
	animate in dialog
	draws laid out text and border:  Cat Prince. We need your help!
	wait for button press
	draw dialog & wait:  Your grandfather the old Cat King has been kidnapped!
	draw dialog & wait: Please rescue him
	animate out dialog
	enable platformer physics


	addComponent(StateMachine, {states:[
	    (machine)=>{
	        PlatformerPhysics.enabled = false
	        view.addComponent(SplashImage, { src:"imgs/splash.png"})
	        view.addComponent(WaitForInput)
	    },
	    (machine) => {
	        view.addComponent(TileMap, { src:"maps/level1.json" }),
	        view.addComponent(FadeTransition, { direction:'in', duration: 0.5, color:'black' })
	        view.addComponent(WaitForTime, { duration:0.5 })
	    },
	    (machine) => {
	        view.addComponent(FadeTransition, { direction:'out', duration: 0.5, color:'black' })
	        view.addComponent(WaitForTime, { duration:0.5 })
	    },
	    (machine) => {
	        view.addComponent(Dialog, { text:"Cat Prince. We need your help!" })
	        view.addComponent(WaitForInput)
	    },
	    (machine) => {
	        view.addComponent(DialogTransition, { direction:'in' })
	        view.addComponent(Dialog, { text:"Your grandfather the old Cat King has been kidnapped!" })
	        view.addComponent(WaitForInput)
	    },
	    (machine) => {
	        view.addComponent(Dialog, { text:"Please rescue him." })
	        view.addComponent(WaitForInput)
	    },
	    (machine) => {
	        view.addComponent(DialogTransition, { direction:'out' })
	        view.addComponent(WaitForTime, {duration: 0.5})
	    }),
	    (machine) => {
	        PlatformerPhysics.enabled = true
	    }),

	]})


	*/
	class WaitForInput extends Component {
	    constructor() {
	        super();
	        this.started = false;
	    }
	}



	class Dialog {
	    constructor() {
	        this.text = "some text";
	        this.tilemap = null;
	        this.text_offset = make_point(0,0);
	        this.text_color = 'black';
	    }
	}
	class FixedWidthFont {
	    constructor() {
	        this.src = null;
	        this.loaded = false;
	        this.image = null;
	        this.lineHeight = 7;
	        this.charHeight = 7;
	        this.charWidth = 4;
	        this._debug_drawn = false;
	    }
	    drawCharCode(ctx,ch) {
	        if(ch === 32) {
	            return this.charWidth
	        }

	        let sx = 0;
	        let sy = 0;
	        if(ch >= 65 && ch <= 90) {
	            sx = ch-65;
	            sy = Math.floor(sx/16);
	            sx = sx % 16;
	        }
	        if(ch === 33) {
	            sx = 0;
	            sy = 3;
	        }
	        if(sx >= 0) {
	            ctx.drawImage(this.image,
	                sx*this.charWidth, sy*(this.height-1), this.charWidth, this.height,
	                0,0, this.charWidth, this.height
	            );
	        }
	        return this.charWidth
	    }
	}

	class VariableWidthFont {
	    constructor() {
	        this.src = null;
	        this.loaded = false;
	        this.image = null;
	        this.charHeight = 7;
	        this.lineHeight = 7;
	        this.charWidth = 4;
	        this.charsPerLine = 8;
	        this._debug_drawn = false;
	        this.widths = {};
	        this.positions = {};
	    }
	    drawCharCode(ctx,ch) {
	        // space
	        let cw = this.charWidth;
	        cw = 3;
	        let str = String.fromCharCode(ch);
	        //
	        if(this.widths[str]) cw = this.widths[str];

	        //space
	        if(ch === 32) return cw
	        let sx = 0;
	        let sy = 0;
	        // if between A and Z
	        if(ch >= 65 && ch <= 90) {
	            sx = ch-65;
	            sy = Math.floor(sx/this.charsPerLine);
	            sx = sx % this.charsPerLine;
	        }
	        // if between a and z
	        if(ch >= 97 && ch <= 122) {
	            sx = ch-97;
	            sy = Math.floor(sx/this.charsPerLine) + 3;
	            sx = sx % this.charsPerLine;
	        }
	        if(this.positions[str]) {
	            sx = this.positions[str].x;
	            sy = this.positions[str].y;
	        }
	        if(sx >= 0) {
	            ctx.drawImage(this.image,
	                //src
	                sx*this.charWidth, sy*(this.charHeight), cw, this.charHeight,
	                //dst
	                0,0, cw, this.charHeight
	            );
	        }
	        return cw+1
	    }
	}

	class DialogSystem extends System {
	    execute(delta, time) {
	        this.queries.fonts.added.forEach(ent => {
	            this.loadImage(ent.getMutableComponent(FixedWidthFont));
	        });
	        this.queries.fonts2.added.forEach(ent => {
	            this.loadImage(ent.getMutableComponent(VariableWidthFont));
	        });
	        this.queries.canvas.results.forEach(ent => {
	            let canvas = ent.getComponent(Canvas);
	            let ctx = canvas.dom.getContext('2d');
	            ctx.imageSmoothingEnabled = false;
	            ctx.save();
	            ctx.scale(canvas.scale,canvas.scale);
	            this.queries.dialogs.results.forEach(ent => {
	                let dialog = ent.getComponent(Dialog);

	                if(dialog.tilemap) {
	                    this.drawTilemap(ctx,dialog.tilemap);
	                } else {
	                    ctx.fillStyle = 'yellow';
	                    ctx.fillRect(8, 8, canvas.width - 8 * 2, canvas.height - 8 * 2);
	                }

	                ctx.save();
	                ctx.translate(dialog.text_offset.x,dialog.text_offset.y);
	                if(ent.hasComponent(FixedWidthFont)) {
	                    let font = ent.getComponent(FixedWidthFont);
	                    let dy = 8;
	                    dialog.text.split("\n").forEach(line => {
	                        this.drawLine(ctx, line, font, 8, dy);
	                        dy += font.lineHeight;
	                    });
	                    return
	                }
	                if(ent.hasComponent(VariableWidthFont)) {
	                    let font = ent.getComponent(VariableWidthFont);
	                    let dy = 8;
	                    dialog.text.split("\n").forEach(line => {
	                        this.drawLine(ctx,line,font,8,dy);
	                        dy += font.lineHeight;
	                    });
	                    return
	                }

	                //if not font specified, just use sans-serif from canvas
	                {
	                    ctx.fillStyle = dialog.text_color;
	                    ctx.font = "6pt normal sans-serif";
	                    let dy = 8;
	                    dialog.text.split("\n").forEach(line => {
	                        let bounds = ctx.measureText(line);
	                        dy += Math.floor((bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent)*1.4);
	                        dy += 1;
	                        ctx.fillText(line, 10, dy);
	                    });
	                }
	                ctx.restore();

	                // console.log(bounds.width, bounds.actualBoundingBoxAscent, bounds.actualBoundingBoxDescent)
	            });
	            ctx.restore();
	        });
	    }

	    drawLine(ctx, line, font, x, y) {
	        // line = line.toUpperCase()
	        for(let i=0; i<line.length; i++) {
	            if(!font._debug_drawn) {
	                font._debug_drawn = true;
	                console.log(line.charAt(i), line.charCodeAt(i));
	            }
	            ctx.save();
	            ctx.translate(x,y);
	            x += font.drawCharCode(ctx,line.charCodeAt(i));
	            ctx.restore();
	        }
	    }

	    drawTilemap(ctx, tilemap) {
	        tilemap.layers.forEach(layer => {
	            this.drawTileLayer(tilemap,ctx,layer);
	        });
	    }
	    drawTileLayer(map,ctx,layer) {
	        for(let y=0; y<layer.height; y++) {
	            for(let x=0; x<layer.width; x++) {
	                let n = y*layer.width+x;
	                let tile_index = layer.data[n];
	                if (tile_index === 0) continue
	                let tile = map.index[tile_index];
	                if(!tile) throw new Error("missing tile " + tile_index + " " + tile)
	                if(tile)  ctx.drawImage(tile,x*map.tilewidth, y*map.tileheight);
	            }
	        }
	    }

	    loadImage(font) {
	        if(!font.image) {
	            font.image = new Image();
	            font.image.onload = () => {
	                font.loaded = true;
	            };
	            font.image.src = font.src;
	        }
	    }
	}
	DialogSystem.queries = {
	    canvas: {
	        components: [Canvas],
	    },
	    dialogs: {
	        components:[Dialog],
	        listen: {
	            added:true
	        }
	    },
	    fonts: {
	        components: [FixedWidthFont],
	        listen: {
	            added:true,
	        }
	    },
	    fonts2: {
	        components: [VariableWidthFont],
	        listen: {
	            added:true,
	        }
	    }
	};

	const ecsytwo = {
	    initialize : function (world) {
	        world.registerSystem(ECSYTwoSystem);
	        world.registerSystem(SpriteSystem);
	        world.registerSystem(KeyboardSystem);
	        world.registerSystem(MouseInputSystem);
	        world.registerSystem(LayerRenderingSystem);
	    },
	    start: startWorld
	};

	exports.AnimatedSprite = AnimatedSprite;
	exports.AudioSystem = AudioSystem;
	exports.BackgroundFill = BackgroundFill;
	exports.Camera = Camera;
	exports.CameraFollowsSprite = CameraFollowsSprite;
	exports.Canvas = Canvas;
	exports.DebugOutline = DebugOutline;
	exports.Dialog = Dialog;
	exports.DialogSystem = DialogSystem;
	exports.DrawFilledRect = DrawFilledRect;
	exports.DrawImage = DrawImage;
	exports.DrawStrokedRect = DrawStrokedRect;
	exports.ECSYTwoSystem = ECSYTwoSystem;
	exports.FilledSprite = FilledSprite;
	exports.FullscreenButton = FullscreenButton;
	exports.FullscreenMode = FullscreenMode;
	exports.FullscreenSystem = FullscreenSystem;
	exports.ImageSprite = ImageSprite;
	exports.InputState = InputState;
	exports.KeyboardState = KeyboardState;
	exports.KeyboardSystem = KeyboardSystem;
	exports.Layer = Layer;
	exports.LayerParent = LayerParent;
	exports.LayerRenderingSystem = LayerRenderingSystem;
	exports.MouseInputSystem = MouseInputSystem;
	exports.MouseState = MouseState;
	exports.PlaySoundEffect = PlaySoundEffect;
	exports.SoundEffect = SoundEffect;
	exports.Sprite = Sprite;
	exports.SpriteSheet = SpriteSheet;
	exports.SpriteSystem = SpriteSystem;
	exports.TileMap = TileMap;
	exports.TileMapSystem = TileMapSystem;
	exports.WaitForInput = WaitForInput;
	exports.default = ecsytwo;
	exports.load_image_from_url = load_image_from_url;
	exports.load_tilemap_from_url = load_tilemap_from_url;
	exports.make_point = make_point;
	exports.startWorld = startWorld;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
