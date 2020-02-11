import { h } from "preact";
import {
  ContribPluginManager,
  CorePlugin,
  OnMediaLoad,
  OnMediaUnload,
  OnPluginSetup,

  ContribServices,
  ContribPluginData,
  ContribPluginConfigs
} from "@playkit-js-contrib/plugin";
import { getContribLogger } from "@playkit-js-contrib/common";
import * as classes from './__plugin_name__-plugin.scss';

const pluginName = `__plugin_name__`;

const logger = getContribLogger({
  class: "__Plugin_Name__Plugin",
  module: "__plugin_name__-plugin"
});

interface __Plugin_Name__PluginConfig {
}

export class __Plugin_Name__Plugin implements OnMediaLoad, OnMediaUnload, OnPluginSetup, OnMediaUnload {

  constructor(
    private _corePlugin: CorePlugin,
    private _contribServices: ContribServices,
    private _configs: ContribPluginConfigs<__Plugin_Name__PluginConfig>
  ) {
  }

  onPluginSetup(): void {
  }

  onMediaLoad(): void {
  }

  onMediaUnload(): void {
  }

  onPluginDestroy(): void {
  }
}

ContribPluginManager.registerPlugin(
  pluginName,
  (data: ContribPluginData<__Plugin_Name__PluginConfig>) => {
    return new __Plugin_Name__Plugin(data.corePlugin, data.contribServices, data.configs);
  },
  {
    defaultConfig: {
    }
  }
);
