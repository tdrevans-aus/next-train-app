#!/usr/bin/env python3
"""Add Next Train WidgetKit extension + shared sources to App.xcodeproj."""

from pathlib import Path
import re

PROJECT = Path(__file__).resolve().parents[1] / "ios/App/App.xcodeproj/project.pbxproj"

SHARED_FILES = [
    "WidgetAppGroup.swift",
    "WidgetSettingsStore.swift",
    "PerthTime.swift",
    "JourneySelector.swift",
    "NextTrainApiClient.swift",
    "NextCommutePreview.swift",
    "CommuteSchedule.swift",
    "WidgetPinResolver.swift",
    "JourneyPinHelper.swift",
    "NearbyPinHelper.swift",
]

def main() -> None:
    text = PROJECT.read_text()
    if "NextTrainWidgetExtension" in text:
        print("Widget extension already present in project.pbxproj")
        return

    ids = {
        "shared_group": "NTWG00011FED79650016851F",
        "widget_group": "NTWG00021FED79650016851F",
        "widget_sync_ref": "NTWG00031FED79650016851F",
        "widget_sync_build": "NTWG00041FED79650016851F",
        "widget_swift_ref": "NTWG00051FED79650016851F",
        "widget_swift_build": "NTWG00061FED79650016851F",
        "widget_plist_ref": "NTWG00071FED79650016851F",
        "widget_ent_ref": "NTWG00081FED79650016851F",
        "app_ent_ref": "NTWG00091FED79650016851F",
        "widget_product": "NTWG000A1FED79650016851F",
        "widget_target": "NTWG000B1FED79650016851F",
        "widget_sources": "NTWG000C1FED79650016851F",
        "widget_frameworks": "NTWG000D1FED79650016851F",
        "widget_resources": "NTWG000E1FED79650016851F",
        "widget_dep": "NTWG000F1FED79650016851F",
        "widget_proxy": "NTWG00101FED79650016851F",
        "embed_phase": "NTWG00111FED79650016851F",
        "embed_file": "NTWG00121FED79650016851F",
        "widget_config_list": "NTWG00131FED79650016851F",
        "widget_debug": "NTWG00141FED79650016851F",
        "widget_release": "NTWG00151FED79650016851F",
    }

    shared_refs = {}
    shared_app_builds = {}
    shared_widget_builds = {}
    for index, name in enumerate(SHARED_FILES):
        key = name.replace(".swift", "").upper()[:12]
        shared_refs[name] = f"NTWS{index:02X}1FED79650016851F"
        shared_app_builds[name] = f"NTWA{index:02X}1FED79650016851F"
        shared_widget_builds[name] = f"NTWW{index:02X}1FED79650016851F"

    build_file_section = []
    file_ref_section = []
    for name in SHARED_FILES:
        ref = shared_refs[name]
        file_ref_section.append(
            f"\t\t{ref} /* {name} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {name}; sourceTree = \"<group>\"; }};"
        )
        build_file_section.append(
            f"\t\t{shared_app_builds[name]} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {ref} /* {name} */; }};"
        )
        build_file_section.append(
            f"\t\t{shared_widget_builds[name]} /* {name} in Sources */ = {{isa = PBXBuildFile; fileRef = {ref} /* {name} */; }};"
        )

    file_ref_section.extend([
        f"\t\t{ids['widget_sync_ref']} /* WidgetSyncPlugin.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = WidgetSyncPlugin.swift; sourceTree = \"<group>\"; }};",
        f"\t\t{ids['widget_swift_ref']} /* NextTrainWidget.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = NextTrainWidget.swift; sourceTree = \"<group>\"; }};",
        f"\t\t{ids['widget_plist_ref']} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; }};",
        f"\t\t{ids['widget_ent_ref']} /* NextTrainWidget.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = NextTrainWidget.entitlements; sourceTree = \"<group>\"; }};",
        f"\t\t{ids['app_ent_ref']} /* App.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = App.entitlements; sourceTree = \"<group>\"; }};",
        f"\t\t{ids['widget_product']} /* NextTrainWidgetExtension.appex */ = {{isa = PBXFileReference; explicitFileType = \"wrapper.app-extension\"; includeInIndex = 0; path = NextTrainWidgetExtension.appex; sourceTree = BUILT_PRODUCTS_DIR; }};",
    ])

    build_file_section.extend([
        f"\t\t{ids['widget_sync_build']} /* WidgetSyncPlugin.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {ids['widget_sync_ref']} /* WidgetSyncPlugin.swift */; }};",
        f"\t\t{ids['widget_swift_build']} /* NextTrainWidget.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {ids['widget_swift_ref']} /* NextTrainWidget.swift */; }};",
        f"\t\t{ids['embed_file']} /* NextTrainWidgetExtension.appex in Embed Foundation Extensions */ = {{isa = PBXBuildFile; fileRef = {ids['widget_product']} /* NextTrainWidgetExtension.appex */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};",
    ])

    shared_children = "\n".join(
        f"\t\t\t\t{shared_refs[name]} /* {name} */," for name in SHARED_FILES
    )

    app_sources_files = "\n".join(
        f"\t\t\t\t{shared_app_builds[name]} /* {name} in Sources */," for name in SHARED_FILES
    )

    widget_sources_files = "\n".join(
        f"\t\t\t\t{shared_widget_builds[name]} /* {name} in Sources */," for name in SHARED_FILES
    )

    insert_build_files = "\n".join(build_file_section)
    insert_file_refs = "\n".join(file_ref_section)

    text = text.replace(
        "/* End PBXBuildFile section */",
        insert_build_files + "\n/* End PBXBuildFile section */",
    )
    text = text.replace(
        "/* End PBXFileReference section */",
        insert_file_refs + "\n/* End PBXFileReference section */",
    )

    text = text.replace(
        "\t\t504EC3061FED79650016851F /* App */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (",
        f"\t\t504EC3061FED79650016851F /* App */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t{ids['app_ent_ref']} /* App.entitlements */,\n\t\t\t\t{ids['widget_sync_ref']} /* WidgetSyncPlugin.swift */,",
    )

    text = text.replace(
        "\t\t504EC2FB1FED79650016851F = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (",
        f"\t\t504EC2FB1FED79650016851F = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t{ids['shared_group']} /* Shared */,\n\t\t\t\t{ids['widget_group']} /* NextTrainWidget */,",
    )

    text = text.replace(
        "\t\t504EC3051FED79650016851F /* Products */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t504EC3041FED79650016851F /* App.app */,",
        f"\t\t504EC3051FED79650016851F /* Products */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t504EC3041FED79650016851F /* App.app */,\n\t\t\t\t{ids['widget_product']} /* NextTrainWidgetExtension.appex */,",
    )

    groups_block = f"""
\t\t{ids['shared_group']} /* Shared */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
{shared_children}
\t\t\t);
\t\t\tpath = ../Shared;
\t\t\tsourceTree = \"<group>\";
\t\t}};
\t\t{ids['widget_group']} /* NextTrainWidget */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{ids['widget_swift_ref']} /* NextTrainWidget.swift */,
\t\t\t\t{ids['widget_plist_ref']} /* Info.plist */,
\t\t\t\t{ids['widget_ent_ref']} /* NextTrainWidget.entitlements */,
\t\t\t);
\t\t\tpath = ../NextTrainWidget;
\t\t\tsourceTree = \"<group>\";
\t\t}};
/* End PBXGroup section */"""

    text = text.replace("/* End PBXGroup section */", groups_block)

    text = text.replace(
        "\t\t504EC3031FED79650016851F /* App */ = {\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildConfigurationList = 504EC3161FED79650016851F /* Build configuration list for PBXNativeTarget \"App\" */;\n\t\t\tbuildPhases = (\n\t\t\t\t504EC3001FED79650016851F /* Sources */,\n\t\t\t\t504EC3011FED79650016851F /* Frameworks */,\n\t\t\t\t504EC3021FED79650016851F /* Resources */,\n\t\t\t);",
        f"\t\t504EC3031FED79650016851F /* App */ = {{\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildConfigurationList = 504EC3161FED79650016851F /* Build configuration list for PBXNativeTarget \"App\" */;\n\t\t\tbuildPhases = (\n\t\t\t\t504EC3001FED79650016851F /* Sources */,\n\t\t\t\t504EC3011FED79650016851F /* Frameworks */,\n\t\t\t\t504EC3021FED79650016851F /* Resources */,\n\t\t\t\t{ids['embed_phase']} /* Embed Foundation Extensions */,\n\t\t\t);",
    )

    text = text.replace(
        "\t\t\tdependencies = (\n\t\t\t);",
        f"\t\t\tdependencies = (\n\t\t\t\t{ids['widget_dep']} /* PBXTargetDependency */,\n\t\t\t);",
        1,
    )

    widget_target = f"""
\t\t{ids['widget_target']} /* NextTrainWidgetExtension */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {ids['widget_config_list']} /* Build configuration list for PBXNativeTarget \"NextTrainWidgetExtension\" */;
\t\t\tbuildPhases = (
\t\t\t\t{ids['widget_sources']} /* Sources */,
\t\t\t\t{ids['widget_frameworks']} /* Frameworks */,
\t\t\t\t{ids['widget_resources']} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = NextTrainWidgetExtension;
\t\t\tproductName = NextTrainWidgetExtension;
\t\t\tproductReference = {ids['widget_product']} /* NextTrainWidgetExtension.appex */;
\t\t\tproductType = \"com.apple.product-type.app-extension\";
\t\t}};
/* End PBXNativeTarget section */"""

    text = text.replace("/* End PBXNativeTarget section */", widget_target)

    text = text.replace(
        "\t\t\t\ttargets = (\n\t\t\t\t504EC3031FED79650016851F /* App */,\n\t\t\t);",
        f"\t\t\t\ttargets = (\n\t\t\t\t504EC3031FED79650016851F /* App */,\n\t\t\t\t{ids['widget_target']} /* NextTrainWidgetExtension */,\n\t\t\t);",
    )

    text = text.replace(
        "\t\t\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n\t\t\t\t9582B6832FE993A70072D4E8 /* SceneDelegate.swift in Sources */,",
        f"\t\t\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */,\n\t\t\t\t9582B6832FE993A70072D4E8 /* SceneDelegate.swift in Sources */,\n\t\t\t\t{ids['widget_sync_build']} /* WidgetSyncPlugin.swift in Sources */,\n{app_sources_files}",
    )

    embed_and_phases = f"""
\t\t{ids['embed_phase']} /* Embed Foundation Extensions */ = {{
\t\t\tisa = PBXCopyFilesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tdstPath = \"\";
\t\t\tdstSubfolderSpec = 13;
\t\t\tfiles = (
\t\t\t\t{ids['embed_file']} /* NextTrainWidgetExtension.appex in Embed Foundation Extensions */,
\t\t\t);
\t\t\tname = \"Embed Foundation Extensions\";
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXCopyFilesBuildPhase section */

/* Begin PBXContainerItemProxy section */
\t\t{ids['widget_proxy']} /* PBXContainerItemProxy */ = {{
\t\t\tisa = PBXContainerItemProxy;
\t\t\tcontainerPortal = 504EC2FC1FED79650016851F /* Project object */;
\t\t\tproxyType = 1;
\t\t\tremoteGlobalIDString = {ids['widget_target']};
\t\t\tremoteInfo = NextTrainWidgetExtension;
\t\t}};
/* End PBXContainerItemProxy section */

/* Begin PBXTargetDependency section */
\t\t{ids['widget_dep']} /* PBXTargetDependency */ = {{
\t\t\tisa = PBXTargetDependency;
\t\t\ttarget = {ids['widget_target']} /* NextTrainWidgetExtension */;
\t\t\ttargetProxy = {ids['widget_proxy']} /* PBXContainerItemProxy */;
\t\t}};
/* End PBXTargetDependency section */

/* Begin PBXFrameworksBuildPhase section */
\t\t{ids['widget_frameworks']} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXResourcesBuildPhase section */
\t\t{ids['widget_resources']} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t{ids['widget_sources']} /* Sources */ = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\t{ids['widget_swift_build']} /* NextTrainWidget.swift in Sources */,
{widget_sources_files}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXSourcesBuildPhase section */"""

    # Insert embed phase before resources end - find Resources build phase end marker
    text = text.replace(
        "/* End PBXResourcesBuildPhase section */",
        embed_and_phases,
        1,
    )

    widget_debug = f"""
\t\t{ids['widget_debug']} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tCODE_SIGN_ENTITLEMENTS = ../NextTrainWidget/NextTrainWidget.entitlements;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_TEAM = TQU93NZ6Z5;
\t\t\t\tINFOPLIST_FILE = ../NextTrainWidget/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t\"$(inherited)\",
\t\t\t\t\t\"@executable_path/Frameworks\",
\t\t\t\t\t\"@executable_path/../../Frameworks\",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.tdrevans.nexttrain.NextTrainWidget;
\t\t\t\tPRODUCT_NAME = \"$(TARGET_NAME)\";
\t\t\t\tSKIP_INSTALL = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{ids['widget_release']} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tCODE_SIGN_ENTITLEMENTS = ../NextTrainWidget/NextTrainWidget.entitlements;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_TEAM = TQU93NZ6Z5;
\t\t\t\tINFOPLIST_FILE = ../NextTrainWidget/Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 15.0;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t\"$(inherited)\",
\t\t\t\t\t\"@executable_path/Frameworks\",
\t\t\t\t\t\"@executable_path/../../Frameworks\",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.tdrevans.nexttrain.NextTrainWidget;
\t\t\t\tPRODUCT_NAME = \"$(TARGET_NAME)\";
\t\t\t\tSKIP_INSTALL = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = \"1,2\";
\t\t\t}};
\t\t\tname = Release;
\t\t}};"""

    text = text.replace(
        "\t\t504EC3171FED79650016851F /* Debug */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbaseConfigurationReference = 958DCC722DB07C7200EA8C5F /* debug.xcconfig */;\n\t\t\tbuildSettings = {\n\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;",
        "\t\t504EC3171FED79650016851F /* Debug */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbaseConfigurationReference = 958DCC722DB07C7200EA8C5F /* debug.xcconfig */;\n\t\t\tbuildSettings = {\n\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;",
    )

    text = text.replace(
        "\t\t504EC3181FED79650016851F /* Release */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;",
        "\t\t504EC3181FED79650016851F /* Release */ = {\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {\n\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;",
    )

    text = text.replace(
        "/* End XCBuildConfiguration section */",
        widget_debug + f"""
\t\t{ids['widget_config_list']} /* Build configuration list for PBXNativeTarget \"NextTrainWidgetExtension\" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{ids['widget_debug']} /* Debug */,
\t\t\t\t{ids['widget_release']} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */""".replace("/* End XCConfigurationList section */", ""),
    )

    # Fix: the replace above might be wrong. Let me fix config list insertion properly.
    if ids['widget_config_list'] not in text:
        text = text.replace(
            "/* End XCBuildConfiguration section */",
            widget_debug + "\n/* End XCBuildConfiguration section */",
        )
        text = text.replace(
            "/* End XCConfigurationList section */",
            f"""
\t\t{ids['widget_config_list']} /* Build configuration list for PBXNativeTarget \"NextTrainWidgetExtension\" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{ids['widget_debug']} /* Debug */,
\t\t\t\t{ids['widget_release']} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */""",
        )

    PROJECT.write_text(text)
    print("Patched project.pbxproj with WidgetKit extension")


if __name__ == "__main__":
    main()
