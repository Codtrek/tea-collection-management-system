import React from 'react';
import {
Modal,
Pressable,
ScrollView,
View,
StyleSheet
} from 'react-native';

import {c} from './demo-teacollector-theme';



export const Sheet=({open,onClose,children}:any)=>{


if(!open)
return null;


return(

<Modal
transparent
visible={open}
animationType="slide"
onRequestClose={onClose}
>

<Pressable
style={styles.sheetOverlay}
onPress={onClose}
/>


<View style={styles.sheetContainer}>


<View style={styles.sheetHandle}/>


<ScrollView
style={styles.sheetScroll}
contentContainerStyle={styles.sheetContent}
>

{children}

</ScrollView>


</View>


</Modal>

)

}




const styles=StyleSheet.create({

sheetOverlay:{
flex:1,
backgroundColor:'rgba(0,0,0,0.28)'
},


sheetContainer:{
position:'absolute',
left:0,
right:0,
bottom:0,
backgroundColor:'#fff',
borderTopLeftRadius:24,
borderTopRightRadius:24,
maxHeight:'85%'
},


sheetHandle:{
width:44,
height:5,
borderRadius:999,
backgroundColor:c.line,
alignSelf:'center',
marginTop:10
},


sheetScroll:{
paddingHorizontal:20,
paddingBottom:24
},


sheetContent:{
paddingTop:12,
paddingBottom:8
}

});