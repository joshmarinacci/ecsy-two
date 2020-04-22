<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.2" tiledversion="1.3.4" name="castle" tilewidth="8" tileheight="8" tilecount="64" columns="8">
 <image source="../imgs/castle@1x.png" width="64" height="64"/>
 <tile id="0" type="floor"/>
 <tile id="1" type="floor"/>
 <tile id="2" type="floor"/>
 <tile id="5" type="floor"/>
 <tile id="12" type="block"/>
 <tile id="16">
  <properties>
   <property name="blocking" type="bool" value="false"/>
  </properties>
 </tile>
 <tile id="32" type="block"/>
 <tile id="33" type="wall">
  <properties>
   <property name="blocking" type="bool" value="true"/>
  </properties>
 </tile>
 <tile id="38" type="wall"/>
 <tile id="43" type="block"/>
 <tile id="61" type="block"/>
</tileset>
