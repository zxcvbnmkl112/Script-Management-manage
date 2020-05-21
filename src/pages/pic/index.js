import React, { Component } from "react";
import { Checkbox, Button, message, Modal, Input, Select, Slider } from "antd"
import Cards from "./components/Cards"
import ControlPanel from "./components/ControlPanel"
import Groups from "./components/Groups"
import { PlusOutlined } from '@ant-design/icons';
import { getGroup, deletGroup } from "@/utils/group"
import { getLocalPic, setLocalPic } from "@/utils/picture"

const { Option } = Select;

const styles = require('./index.less')

export default class App extends React.Component {
    ws = null
    //接受到的消息列表 缓存一下消息内容
    results = []
    timer = null
    state = {
        tempId: new Date().getTime(),
        //服务端连接状态
        hasConnect: false,
        //所有的设备
        allDevices: [],
        //需要展示的设备
        showDevices: [],
        //目前选中的group
        currentGroup: null,
        //全选盒子
        checked: false,
        //服务端连接
        url: "",
    };

    componentDidMount() {
        document.title = "ID:" + this.state.tempId
        let url = localStorage.getItem("url")
        this.setState({ url })

        this.timer = setInterval(() => {
            const { showDevices, allDevices } = this.state
            if (this.results.length) {
                this.results.forEach(result => {
                    if (result.data.msgType != 'base64') {
                        //全部设备里面的日志更新
                        allDevices.forEach(v => {
                            if (v.id == result.from.id) {
                                v.data = result.data
                            }
                        })
                        // 当前设备里的实时日志更新
                        showDevices.forEach(v => {
                            if (v.id == result.from.id) {
                                v.data = result.data
                            }
                        })
                    }
                    //获取图片
                    if (result.data && result.data.cmd == "updateSnapshot") {
                        //客户端截图成功
                        if (result.data.msgType == 'base64') {
                            setLocalPic(result.from.id, "data:image/jpeg;base64," + result.data.retMsg)
                        }
                    }
                })
                this.setState({
                    allDevices: JSON.parse(JSON.stringify(allDevices)),
                    showDevices: JSON.parse(JSON.stringify(showDevices)),
                })
            }
            this.results = []
        }, 1000)
    }

    componentWillUnmount() {
        this.state.hasConnect && this.ws.close()
        this.timer && clearInterval(this.timer)
    }

    //连接SOCKET
    connect = () => {
        const { tempId, url } = this.state
        if (!url) {
            message.error("连接不能为空!")
            return
        }
        this.ws = new WebSocket(`${url}/manager?id=${tempId}`)
        this.ws.addEventListener('message', (event) => {
            let result = {}
            try {
                result = JSON.parse(event.data)
            } catch (err) {
                message.error("返回消息解析错误:", err)
                return
            }
            const { currentGroup, showDevices, allDevices } = this.state

            //获得所有设备，更新设备状态
            if (result.from && result.from.group == "server") {
                if (result.data && result.data.cmd == "getAllOnline") {
                    this.setState({ showDevices: result.data.retMsg, allDevices: result.data.retMsg, currentGroup: "全部", checked: false })
                } else if (result.data && result.data.cmd == "online") {
                    message.success(`${result.data.retMsg.name} 上线`)
                    allDevices.push(result.data.retMsg)
                } else if (result.data && result.data.cmd == "offline") {
                    message.error(`${result.data.retMsg.name} 下线`)
                    for (let i = 0; i < allDevices.length; i++) {
                        if (allDevices[i].id == result.data.retMsg.id) {
                            allDevices.splice(i, 1)
                        }
                    }
                }
                this.handleGroup(currentGroup)
            }
            //接受来自手机的消息
            else if (result.from && result.from.group == "phone") {
                this.results.push(result)
            }
        });
        this.ws.addEventListener('error', (event) => {
            console.log('Error', event);
            message.error("服务器连接失败!")
        });

        this.ws.addEventListener('open', (event) => {
            console.log('Open', event);
            this.setState({
                hasConnect: true,
            })
            this.getAllDevices()
            message.success("服务器连接成功!")
        });

        this.ws.addEventListener('close', (event) => {
            console.log('Close', event);
            message.info("连接已关闭!")
            this.setState({
                hasConnect: false,
                showDevices: [],
                allDevices: [],
                checked: false
            })
        });
    }

    //★★★★★★★★★筛选★★★★★★★★★
    handleGroup = (group, removeCheck) => {
        console.log("group", group)
        const { allDevices, showDevices } = this.state
        let newShowDevices = [];
        //是否需要去掉checked属性
        let cloneAllDevices = allDevices && allDevices.map(v => {
            let temp = JSON.parse(JSON.stringify(v))
            if (removeCheck) {
                delete temp.checked
            } else {
                showDevices.forEach(v1 => {
                    if (v1.id == temp.id) {
                        temp.checked = v1.checked
                    }
                })
            };
            return temp
        });

        if (group.name == "全部") {
            this.setState({ showDevices: cloneAllDevices, currentGroup: group, checked: false })
            return
        }


        //filter 返回的子元素是引用类型时，需要深拷贝一下数组，不然会影响原数据
        if (group.type == 1) {
            newShowDevices = cloneAllDevices.filter(v => {
                //如果没有data字段
                if(!v.data)return false
                return Object.keys(group.regs).reduce((pre, cur, index) => {
                    return pre && group.regs[cur].reduce((p,c,i)=>{
                        if(!c)return p
                        let reg = new RegExp(c)
                        return p && reg.test(v.data[cur])
                    },true)
                }, true)
            })
        } else if (group.type == 2) {
            newShowDevices = cloneAllDevices.filter(v => { return group.data.indexOf(v.id) != -1 })
        }
        this.setState({ showDevices: newShowDevices, currentGroup: group, checked: false })
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
    handleCardCheck = (showDevices) => {
        this.setState({ showDevices })
    }

    //底部回调的值
    handleBottomObj = (msg) => {
        const { showDevices } = this.state
        let ids = showDevices.filter(v => v.checked).map(v => v.id)
        if (ids.length<1) return message.error("未选择设备")
        this.sendMessage(msg, { group: "phone", id: ids })
    }

    //调用websocket发送消息 
    sendMessage = (data, dis) => {
        const { hasConnect, tempId } = this.state
        if (!hasConnect) {
            message.error("未连接，执行失败！")
            return
        }
        let from = { group: "console", id: tempId.toString() }
        this.ws && this.ws.send(JSON.stringify({
            from,
            data,
            dis
        }))
    }

    //操作连接地址Input
    handleInputUrl = (e) => {
        this.setState({ url: e.target.value })
        //缓存
        localStorage.setItem("url", e.target.value)
    }

    //  连接/断开按钮
    handleConnect = () => {
        const { hasConnect } = this.state
        if (hasConnect) {
            this.ws && this.ws.close()
        } else {
            this.connect()
        }
    }

    //获取所有设备
    getAllDevices = () => {
        this.sendMessage({ cmd: "getAllOnline" }, { group: "server" })
    }

    //滑动条
    handleSlider = (value) => {
        const { showDevices } = this.state
        this.sendMessage({ codeType: "device", cmd: "setScreenBrightness", brightness: value }, { group: "phone", id: showDevices.filter(v => v.checked).map(v => v.id) })
    }

    render() {
        const { checked, showDevices, hasConnect, url ,currentGroup} = this.state
        return <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    {/* <Button type="primary" danger onClick={this.handleModal_delete} className={styles.notice}>删除分组</Button> */}
                    <Checkbox style={{ marginLeft: "96px" }} checked={checked} onClick={this.handleCheck}>全选</Checkbox>
                    <span style={{ paddingLeft: "30px" }}>当前分组数量:<span style={{ color: "green", fontSize: 20 }}>{showDevices.length}</span></span>
                    <span style={{ paddingLeft: "30px" }}>已经勾选数量:<span style={{ color: "green", fontSize: 20 }}>{showDevices.filter(v => v.checked).length}</span></span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>调节屏幕亮度:<Slider className={styles.slider} defaultValue={30} max={100} min={0} onAfterChange={this.handleSlider} /></div>
                <div className={styles.status}>
                    {hasConnect ? <div style={{ color: "green" }}>已连接</div> : <div style={{ color: "red" }}>未连接</div>}
                    <Input value={url} placeholder={"服务器地址"} onChange={this.handleInputUrl} />
                    <Button onClick={this.handleConnect}>{hasConnect ? "断开" : "连接"}</Button>
                </div>
            </div>

            <div className={styles.content}>
                {/* 左边分组 */}
                <Groups ref={ref=>{this.groupsRef=ref}} handleBack={group => this.handleGroup(group, true)} devices={showDevices} />
                {/* 手机列表 */}
                <Cards devices={showDevices} currentGroup={currentGroup} onChecked={this.handleCardCheck} sendFunc={this.sendMessage}  handleDevice={this.groupsRef && this.groupsRef.handleDevice}/>
            </div>
            {/* 命令控制面板 */}
            <ControlPanel sendCmd={this.handleBottomObj} sendFunc={this.sendMessage} />
        </div>
    }
}