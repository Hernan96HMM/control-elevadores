CREATE TABLE `auditoria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`accion` text NOT NULL,
	`entidad` text,
	`entidad_id` text,
	`detalle` text,
	`ip` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auditoria_creado_idx` ON `auditoria` (`creado_en`);--> statement-breakpoint
CREATE TABLE `config` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `control_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`control_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`orden` integer NOT NULL,
	`texto` text NOT NULL,
	`critico` integer NOT NULL,
	`ok` integer NOT NULL,
	`observacion` text,
	`foto` text,
	FOREIGN KEY (`control_id`) REFERENCES `controles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items_checklist`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `control_items_control_idx` ON `control_items` (`control_id`);--> statement-breakpoint
CREATE TABLE `controles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`equipo_id` integer NOT NULL,
	`operario_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`horas` real NOT NULL,
	`resultado` text NOT NULL,
	`firmado_en` text NOT NULL,
	`observaciones` text,
	`client_id` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`equipo_id`) REFERENCES `equipos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`operario_id`) REFERENCES `operarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `controles_equipo_fecha_uq` ON `controles` (`equipo_id`,`fecha`);--> statement-breakpoint
CREATE UNIQUE INDEX `controles_client_id_uq` ON `controles` (`client_id`);--> statement-breakpoint
CREATE TABLE `equipos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipos_codigo_unique` ON `equipos` (`codigo`);--> statement-breakpoint
CREATE TABLE `falla_eventos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`falla_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`estado_desde` text,
	`estado_hasta` text,
	`comentario` text,
	`foto` text,
	`autor` text NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`falla_id`) REFERENCES `fallas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `falla_eventos_falla_idx` ON `falla_eventos` (`falla_id`);--> statement-breakpoint
CREATE TABLE `fallas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`equipo_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`control_id` integer NOT NULL,
	`item_texto` text NOT NULL,
	`critica` integer NOT NULL,
	`estado` text DEFAULT 'abierta' NOT NULL,
	`descripcion` text,
	`fecha_recepcion` text NOT NULL,
	`fecha_reparacion` text,
	`responsable_reparacion` text,
	`conformidad_operario_id` integer,
	`conformidad_en` text,
	`ocurrencias` integer DEFAULT 1 NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`equipo_id`) REFERENCES `equipos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items_checklist`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`control_id`) REFERENCES `controles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conformidad_operario_id`) REFERENCES `operarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fallas_equipo_estado_idx` ON `fallas` (`equipo_id`,`estado`);--> statement-breakpoint
CREATE TABLE `items_checklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orden` integer NOT NULL,
	`texto` text NOT NULL,
	`critico` integer DEFAULT false NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`legajo` text,
	`habilitado` integer DEFAULT true NOT NULL,
	`pin_hash` text,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operarios_nombre_unique` ON `operarios` (`nombre`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario` text NOT NULL,
	`nombre` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_usuario_unique` ON `usuarios` (`usuario`);