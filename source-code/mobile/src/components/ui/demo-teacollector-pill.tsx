import React from 'react';
import {View,Text,StyleSheet} from 'react-native';
import {STATUS_STYLE} from './demo-teacollector-theme';


export const Pill=({status,children}:any)=>{

const style=
STATUS_STYLE[status] || STATUS_STYLE.pending;


return(
<View style={[
styles.pill,
{
backgroundColor:style.bg
}
]}>

<Text style={[
styles.pillText,
{
color:style.fg
}
]}>

{children || style.label}

</Text>

</View>
)

}



const styles=StyleSheet.create({

pill:{
borderRadius:999,
paddingHorizontal:10,
paddingVertical:5,
alignSelf:'flex-start'
},

pillText:{
fontSize:12,
fontWeight:'700'
}

});