import React, { Component } from "react";
import { Checkbox, Button,  message, Modal, Input, Select } from "antd"
import Cards from "./cards"
import Bottom from "./bottom"
import { PlusOutlined } from '@ant-design/icons';
import { getGroup, setGroup, deletGroup } from "@/utils/group"

const { Option } = Select;

const styles = require('./index.less')

export default class App extends React.Component {
    ws = null
    state = {
        tempId: new Date().getTime(),
        hasConnect: false,
        groups: getGroup(),
        //所有的设备
        allDevices: [{ id: "1025", name: "iphone", url: "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png", lastLog: "开机" }, { id: "1024", name: "iphone", url: "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png", lastLog: "开机" }, { id: "1023", name: "iphone", url: "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png", lastLog: "开机" }, { id: "1022", name: "iphone", url: "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png", lastLog: "开机" }, { id: "1021", name: "iphone", url: "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png", lastLog: "开机" }, { id: "1020", name: "iphone", url: "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png", lastLog: "开机" }],
        //需要展示的设备
        showDevices: [],
        //目前选中的group
        currentGroup: "全部",
        //删除模态框
        visible: false,
        //需要删除的分组的名字
        name: "",
        //全选盒子
        checked: false,

        //添加分组模态框
        addVisible: false,
        addName: "",
        type: 2,
        reg: ""
    };
    componentDidMount() {
        document.title = "ID:" + this.state.tempId
        // this.connect()
        this.setState({showDevices:this.state.allDevices})
    }

    componentWillUnmount() {
        this.state.hasConnect && this.ws.close()
    }

    //连接SOCKET
    connect = () => {
        const { tempId } = this.state
        this.ws = new WebSocket(`ws://localhost:8080/manager?id=${tempId}`)
        this.ws.addEventListener('message', (event) => {
            console.log('Message from server ', event.data, this.state);

        });
        this.ws.addEventListener('error', (event) => {
            console.log('Error', event);
            message.error("服务器连接失败!请手动连接!")
        });

        this.ws.addEventListener('open', (event) => {
            console.log('Open', event);
            this.setState({
                hasConnect: true,
            })
            message.success("服务器连接成功!")
        });

        this.ws.addEventListener('close', (event) => {
            console.log('Close', event);
            message.info("连接已关闭!")
            this.setState({
                hasConnect: false,
            })
        });

    }

    //筛选
    handleGroup = (value) => {
        const { allDevices } = this.state
        let showDevices = [];
        //filter 返回的子元素是引用类型时，需要深拷贝一下数组，不然会影响原数据
        if (value.type == 1) {
            let reg = new RegExp(value.reg)
            showDevices = JSON.parse(JSON.stringify(allDevices.filter(v => reg.test(v.id))))
        } else if (value.type == 2) {
            showDevices = JSON.parse(JSON.stringify(allDevices.filter(v => { return value.data.indexOf(v.id) != -1 })))
        }
        this.setState({ showDevices, currentGroup: value.name, checked: false })
    }

    //==========================删除模态框==========================
    handleOk_delete = () => {
        // this.setState({ visible: !this.state.visible })
        const { name, groups } = this.state
        console.log("inputValue", this.state.name)
        if (name == "全部") {
            message.error("不能删除全部分组!")
            return
        }
        if (groups.filter(v => v.name == name).length == 0) {
            message.error(`没有分组:${name}`)
            return
        }
        message.success("删除成功!")
        this.setState({
            currentGroup: "全部",
            groups: deletGroup(name),
            visible: !this.state.visible,
            checked: false,
        })
    }

    handleModal_delete = () => {
        this.setState({ visible: !this.state.visible })
    }

    handleInputName = (e) => {
        this.setState({ name: e.target.value })
    }

    //==========================添加模态框==========================
    handleOk_add = () => {
        const { addName, type, reg ,showDevices} = this.state
        console.log("OK:", addName, type, reg)
        let item={name:addName,type}
        if(type==1){
            item.reg=reg
        }else{
            item.data=showDevices.filter(v=>v.checked).map(v=>v.id)
        }
        let result=setGroup(item)
        if(!result){
            message.error("添加失败！")
            return
        }
        this.setState({
            groups:result,
        })
        this.handleGroup(item)
    }

    handleModal_add = () => {
        this.setState({ addVisible: !this.state.addVisible })
    }

    handleInput_add = (key, value) => {
        this.setState({
            [key]: value
        })
    }


    //checkBox 全选
    handleCheck = (e) => {
        const { showDevices } = this.state
        showDevices.forEach(v => {
            v.checked = e.target.checked
        })
        this.setState({
            checked: e.target.checked
        })
    }

    //处理设备被check
    handleCardCheck=(showDevices)=>{
        this.setState({showDevices})
    }

    //底部回调的值
    handleBottomObj=(obj)=>{
        console.log("BottomCB",obj)
    }

    //调用websocket发送消息
    sendMessage=(data)=>{
        this.ws&&this.ws.send(JSON.stringify(data))
    }

    render() {
        const { groups, allDevices, currentGroup, visible, checked, addVisible, type,showDevices } = this.state
        return <div className={styles.container}>
            <div>
                <Button type="primary" danger onClick={this.handleModal} className={styles.notice}>删除分组</Button>
                <Checkbox checked={checked} onClick={this.handleCheck}>全选</Checkbox>
            </div>
            <div className={styles.content}>

                <div className={styles.groupList}>
                    {groups.map((value, i) => {
                        return <Button type={currentGroup == value.name ? "primary" : null} key={i} onClick={() => { this.handleGroup( value) }} >{value.name}</Button>
                    })}
                    <Button onClick={this.handleModal_add}><PlusOutlined style={{ fontSize: 45, color: "rgba(0,0,0,0.3)" }} /></Button>
                </div>

                
                <Cards devices={showDevices} onChecked={this.handleCardCheck} sendFunc={this.sendMessage}/>
                
            </div>

            <Bottom callBack={this.handleBottomObj} sendFunc={this.sendMessage}/>

            <Modal
                title="删除分组"
                visible={visible}
                onOk={this.handleOk_delete}
                onCancel={this.handleModal_delete}
            >
                <Input placeholder="请输入需要删除分组的名字!" onChange={this.handleInputName} />
            </Modal>
            <Modal
                title="添加分组"
                visible={addVisible}
                onOk={this.handleOk_add}
                onCancel={this.handleModal_add}
            >
                <Input className={styles.item} placeholder="请输入需分组名字！" onChange={(e) => { this.handleInput_add("addName", e.target.value) }} />
                <Select className={styles.item} defaultValue={type} style={{ width: 180 }} onChange={(value) => {
                    this.handleInput_add("type", value)
                }
                }>
                    <Option value={1}>正则表达式筛选</Option>
                    <Option value={2}>手动点击筛选</Option>
                </Select>
                {type == 1 ? <Input className={styles.item} placeholder="请输入正则表达式！" onChange={(e) => { this.handleInput_add("reg", e.target.value) }} /> : null}
            </Modal>
        </div>
    }
}